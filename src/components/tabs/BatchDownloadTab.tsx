import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  InputAdornment,
  Chip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CloudDownload,
  Download,
  GetApp,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Warning,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';

interface BatchDownloadResponse {
  success: boolean;
  message: string;
  filename?: string;
  size?: string;
  downloadUrl?: string;
  error?: string;
}

const BatchDownloadTab: React.FC = () => {
  const [batchId, setBatchId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<BatchDownloadResponse | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    if (!batchId.trim()) {
      setDownloadResult({
        success: false,
        error: 'Batch ID is required',
        message: 'Please enter a valid batch ID'
      });
      return;
    }
  
    setIsDownloading(true);
    setDownloadResult(null);
    setDownloadProgress(0);
  
    // simulate progress
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 200);
  
    try {
      console.log('🚀 Starting batch download for batch ID:', batchId);
  
      // Use the service which handles auth + blob for us
      const res = await apiService.downloadBatch(batchId);
  
      clearInterval(progressInterval);
  
      if (!res.success) {
        console.error('❌ Download failed:', res);
        setDownloadProgress(0);
        setDownloadResult({
          success: false,
          error: res.error || 'DOWNLOAD_FAILED',
          message: res.message || 'Download failed - check console for details'
        });
        return;
      }
  
      // Auto-trigger the download using the blob URL we received
      const filename = res.filename || `batch_${batchId}.json`;
      if (res.downloadUrl) {
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
  
        // give the browser a tick before revoking
        setTimeout(() => URL.revokeObjectURL(res.downloadUrl!), 1500);
      }
  
      setDownloadProgress(100);
      setDownloadResult({
        success: true,
        message: 'Download started successfully',
        filename,
        size: res.size
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error('❌ Batch download error:', error);
      setDownloadProgress(0);
      setDownloadResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Download failed - check console for details'
      });
    } finally {
      setIsDownloading(false);
    }
  };  

  const handleReset = () => {
    setDownloadResult(null);
    setDownloadProgress(0);
  };

  const activeStep = !batchId ? 0 : isDownloading ? 1 : downloadResult ? 2 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
            }}
          >
            <GetApp sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
              Batch Download
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
              Download delivery batches from Turing labeling system
            </Typography>
          </Box>
        </Box>

        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 3,
            border: '1px solid #bfdbfe',
            backgroundColor: '#eff6ff',
            '& .MuiAlert-icon': {
              color: '#3b82f6',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>📦 Batch Download:</strong> Enter your batch ID to download RLHF JSON data from the Turing labeling system.
            The file will be saved to your default download folder.
          </Typography>
        </Alert>
      </Box>

      {/* Progress Stepper */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          p: 4,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a', mb: 3 }}>
          Download Process
        </Typography>
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel
          sx={{
            '& .MuiStepLabel-root .Mui-completed': {
              color: '#059669',
            },
            '& .MuiStepLabel-root .Mui-active': {
              color: '#8b5cf6',
            },
            '& .MuiStepConnector-alternativeLabel': {
              top: 10,
              left: 'calc(-50% + 16px)',
              right: 'calc(50% + 16px)',
            },
            '& .MuiStepConnector-alternativeLabel.Mui-active .MuiStepConnector-line': {
              borderColor: '#8b5cf6',
            },
            '& .MuiStepConnector-alternativeLabel.Mui-completed .MuiStepConnector-line': {
              borderColor: '#059669',
            },
          }}
        >
          <Step>
            <StepLabel>Enter Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Download</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
          </Step>
        </Stepper>
      </Box>

      {/* Input Form */}
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a', mb: 3 }}>
          Download Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Delivery Batch ID"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            fullWidth
            disabled={isDownloading}
            placeholder="e.g., 659"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Chip 
                    label="BATCH" 
                    size="small" 
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 20,
                      bgcolor: '#8b5cf6',
                      color: 'white',
                      fontWeight: 600
                    }} 
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: '#fafafa',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
                '&.Mui-focused': {
                  backgroundColor: 'white',
                },
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {downloadResult && (
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isDownloading}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderColor: '#d1d5db',
                  color: '#6b7280',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f9fafb',
                  },
                }}
              >
                Reset
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleDownload}
              disabled={isDownloading || !batchId.trim()}
              startIcon={isDownloading ? <CircularProgress size={20} /> : <Download />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 6px 16px rgba(139, 92, 246, 0.35)',
                },
                '&:disabled': {
                  background: '#d1d5db',
                  color: '#9ca3af',
                  boxShadow: 'none',
                },
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download Batch'}
            </Button>
          </Box>
        </Box>

        {/* Progress Bar */}
        {isDownloading && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280' }}>
                Downloading batch data...
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#8b5cf6' }}>
                {downloadProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={downloadProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Results */}
      {downloadResult && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            border: downloadResult.success ? '1px solid #d1fae5' : '1px solid #fecaca',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            background: downloadResult.success 
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
              : 'linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {downloadResult.success ? (
              <CheckCircle sx={{ color: '#059669', fontSize: 24 }} />
            ) : (
              <ErrorIcon sx={{ color: '#dc2626', fontSize: 24 }} />
            )}
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: downloadResult.success ? '#065f46' : '#991b1b' 
              }}
            >
              {downloadResult.success ? 'Download Successful!' : 'Download Failed'}
            </Typography>
          </Box>

          <Typography 
            variant="body1" 
            sx={{ 
              color: downloadResult.success ? '#047857' : '#7f1d1d',
              mb: 2,
              fontWeight: 500
            }}
          >
            {downloadResult.message}
          </Typography>

          {downloadResult.success && downloadResult.filename && (
            <Box sx={{ 
              p: 3, 
              borderRadius: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(5, 150, 105, 0.2)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#065f46', mb: 1 }}>
                File Details:
              </Typography>
              <Typography variant="body2" sx={{ color: '#047857' }}>
                <strong>Filename:</strong> {downloadResult.filename}
              </Typography>
              {downloadResult.size && (
                <Typography variant="body2" sx={{ color: '#047857' }}>
                  <strong>Size:</strong> {downloadResult.size}
                </Typography>
              )}
            </Box>
          )}

          {!downloadResult.success && downloadResult.error && (
            <Box sx={{ 
              p: 3, 
              borderRadius: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(220, 38, 38, 0.2)'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b', mb: 1 }}>
                Error Details:
              </Typography>
              <Typography variant="body2" sx={{ color: '#7f1d1d', fontFamily: 'monospace' }}>
                {downloadResult.error}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default BatchDownloadTab;
