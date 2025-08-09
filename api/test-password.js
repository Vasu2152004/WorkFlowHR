export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Accept both GET and POST
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Password test endpoint working',
      methods: ['GET', 'POST'],
      instruction: 'Send POST with email and password to test'
    })
  }

  if (req.method === 'POST') {
    try {
      const { email, password } = req.body

      // Simple test - let's manually check admin@test.com
      if (email === 'admin@test.com') {
        return res.status(200).json({
          success: true,
          email: email,
          password_provided: password,
          test_results: {
            'admin': password === 'admin',
            'password': password === 'password', 
            'test': password === 'test',
            '123456': password === '123456',
            'admin123': password === 'admin123'
          },
          message: 'Manual password test completed'
        })
      }

      return res.status(200).json({
        success: false,
        email: email,
        message: 'Only testing admin@test.com for now'
      })

    } catch (error) {
      return res.status(500).json({
        error: 'Test failed',
        message: error.message
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
