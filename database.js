const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - all values must be provided via environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Validate required environment variables
const requiredEnvVars = ['DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please ensure these are set in your .env file or environment');
  process.exit(1);
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Database service class
class DatabaseService {
  constructor() {
    this.pool = pool;
  }

  // Test connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  // Get activities with pagination and filters
  async getActivities(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      action = '',
      status = '',
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    try {
      const client = await this.pool.connect();
      
      // Build WHERE clause based on filters
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(`(
          user_email ILIKE $${paramCount} OR 
          user_name ILIKE $${paramCount} OR 
          file_name ILIKE $${paramCount} OR 
          details ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      if (action && action !== 'all') {
        paramCount++;
        whereConditions.push(`action = $${paramCount}`);
        queryParams.push(action);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereConditions.push(`status = $${paramCount}`);
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM activities
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get paginated activities
      const activitiesQuery = `
        SELECT 
          activity_id as id,
          user_email,
          user_name,
          action,
          file_name,
          file_size,
          timestamp,
          status,
          details,
          created_at
        FROM activities
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);
      const activitiesResult = await client.query(activitiesQuery, queryParams);

      // Get statistics
      const statsQuery = `
        SELECT 
          COUNT(CASE WHEN action = 'upload' THEN 1 END) as total_uploads,
          COUNT(CASE WHEN action = 'download' THEN 1 END) as total_downloads,
          COUNT(CASE WHEN action = 'delete' THEN 1 END) as total_deletes,
          COUNT(DISTINCT user_email) as total_users
        FROM activities
        ${whereClause}
      `;

      const statsResult = await client.query(statsQuery, queryParams.slice(0, -2)); // Remove limit and offset params
      const stats = statsResult.rows[0];

      client.release();

      return {
        activities: activitiesResult.rows.map(row => ({
          id: row.id,
          userEmail: row.user_email,
          userName: row.user_name,
          action: row.action,
          fileName: row.file_name,
          fileSize: row.file_size,
          timestamp: row.timestamp,
          status: row.status,
          details: row.details
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        stats: {
          totalUploads: parseInt(stats.total_uploads) || 0,
          totalDownloads: parseInt(stats.total_downloads) || 0,
          totalDeletes: parseInt(stats.total_deletes) || 0,
          totalUsers: parseInt(stats.total_users) || 0
        }
      };
    } catch (error) {
      console.error('❌ Error fetching activities from database:', error);
      throw error;
    }
  }

  // Get users with pagination and filters
  async getUsers(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      role = '',
      sortBy = 'added_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    try {
      const client = await this.pool.connect();
      
      // Build WHERE clause based on filters
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(`(
          email ILIKE $${paramCount} OR 
          added_by ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      if (role && role !== 'all') {
        paramCount++;
        whereConditions.push(`role = $${paramCount}`);
        queryParams.push(role);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM authorized_users
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get paginated users
      const usersQuery = `
        SELECT 
          id,
          email,
          role,
          added_at,
          added_by,
          updated_at
        FROM authorized_users
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);
      const usersResult = await client.query(usersQuery, queryParams);

      client.release();

      return {
        users: usersResult.rows.map(row => ({
          id: row.id,
          email: row.email,
          role: row.role,
          addedAt: row.added_at,
          addedBy: row.added_by,
          lastUpdatedAt: row.updated_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Error fetching users from database:', error);
      throw error;
    }
  }

  // Add new user to database
  async addUser(userData) {
    const { email, role, addedBy } = userData;

    try {
      const client = await this.pool.connect();
      
      // Check if user already exists
      const existingUserQuery = 'SELECT id FROM authorized_users WHERE email = $1';
      const existingResult = await client.query(existingUserQuery, [email.toLowerCase()]);
      
      if (existingResult.rows.length > 0) {
        client.release();
        throw new Error('USER_EXISTS');
      }

      const query = `
        INSERT INTO authorized_users (email, role, added_at, added_by)
        VALUES ($1, $2, NOW(), $3)
        RETURNING id, email, role, added_at, added_by, updated_at
      `;

      const values = [email.toLowerCase(), role, addedBy];
      const result = await client.query(query, values);
      client.release();

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        addedAt: result.rows[0].added_at,
        addedBy: result.rows[0].added_by,
        lastUpdatedAt: result.rows[0].updated_at
      };
    } catch (error) {
      console.error('❌ Error adding user to database:', error);
      throw error;
    }
  }

  // Update user role in database
  async updateUser(email, newRole) {
    try {
      const client = await this.pool.connect();
      
      const query = `
        UPDATE authorized_users 
        SET role = $1
        WHERE email = $2
        RETURNING id, email, role, added_at, added_by, updated_at
      `;

      const result = await client.query(query, [newRole, email.toLowerCase()]);
      client.release();

      if (result.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        addedAt: result.rows[0].added_at,
        addedBy: result.rows[0].added_by,
        lastUpdatedAt: result.rows[0].updated_at
      };
    } catch (error) {
      console.error('❌ Error updating user in database:', error);
      throw error;
    }
  }

  // Delete user from database
  async deleteUser(email) {
    try {
      const client = await this.pool.connect();
      
      const query = `
        DELETE FROM authorized_users 
        WHERE email = $1
        RETURNING id, email, role, added_at, added_by
      `;

      const result = await client.query(query, [email.toLowerCase()]);
      client.release();

      if (result.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        addedAt: result.rows[0].added_at,
        addedBy: result.rows[0].added_by
      };
    } catch (error) {
      console.error('❌ Error deleting user from database:', error);
      throw error;
    }
  }

  // Get user by email from database
  async getUserByEmail(email) {
    try {
      const client = await this.pool.connect();
      
      const query = `
        SELECT id, email, role, added_at, added_by, updated_at
        FROM authorized_users 
        WHERE email = $1
      `;

      const result = await client.query(query, [email.toLowerCase()]);
      client.release();

      if (result.rows.length === 0) {
        return null;
      }

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        addedAt: result.rows[0].added_at,
        addedBy: result.rows[0].added_by,
        lastUpdatedAt: result.rows[0].updated_at
      };
    } catch (error) {
      console.error('❌ Error getting user from database:', error);
      throw error;
    }
  }

  // Add new activity to database
  async addActivity(activityData) {
    const {
      id,
      userEmail,
      userName,
      action,
      fileName,
      fileSize,
      status,
      details
    } = activityData;

    try {
      const client = await this.pool.connect();
      
      const query = `
        INSERT INTO activities (
          activity_id, user_email, user_name, action, 
          file_name, file_size, timestamp, status, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (activity_id) DO UPDATE SET
          user_email = EXCLUDED.user_email,
          user_name = EXCLUDED.user_name,
          action = EXCLUDED.action,
          file_name = EXCLUDED.file_name,
          file_size = EXCLUDED.file_size,
          timestamp = EXCLUDED.timestamp,
          status = EXCLUDED.status,
          details = EXCLUDED.details
        RETURNING *
      `;

      const values = [
        id,
        userEmail,
        userName,
        action,
        fileName,
        fileSize,
        new Date().toISOString(),
        status,
        details
      ];

      const result = await client.query(query, values);
      client.release();

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error adding activity to database:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
    console.log('✅ Database connection pool closed');
  }
}

// Create and export database service instance
const databaseService = new DatabaseService();

module.exports = databaseService;
