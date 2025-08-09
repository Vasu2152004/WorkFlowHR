export default function handler(req, res) {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'WorkFlowHR API is running',
    version: '1.0.0'
  })
}
