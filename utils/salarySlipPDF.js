const puppeteer = require('puppeteer')

// Generate salary slip PDF
const generateSalarySlipPDF = async (salarySlip, employee, details = []) => {
  let browser
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // Create HTML content for salary slip
    const htmlContent = generateSalarySlipHTML(salarySlip, employee, details)

    // Set content and wait for it to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    // Generate PDF with proper settings
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      displayHeaderFooter: false
    })

    return pdf
  } catch (error) {
    console.error('Salary slip PDF generation error:', error)
    throw new Error('Failed to generate salary slip PDF')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Generate HTML content for salary slip
const generateSalarySlipHTML = (salarySlip, employee, details = []) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const monthName = monthNames[salarySlip.month - 1]
  const year = salarySlip.year

  // Separate additions and deductions
  const additions = details.filter(d => d.component_type === 'addition')
  const deductions = details.filter(d => d.component_type === 'deduction')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salary Slip - ${employee.full_name} - ${monthName} ${year}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 40px;
            font-size: 14px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .header h1 {
            color: #2563eb;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .header p {
            color: #6b7280;
            font-size: 16px;
          }
          
          .employee-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          
          .info-section h3 {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .info-label {
            font-weight: 500;
            color: #374151;
          }
          
          .info-value {
            font-weight: 400;
            color: #1f2937;
          }
          
          .salary-breakdown {
            margin-bottom: 30px;
          }
          
          .salary-breakdown h3 {
            color: #1f2937;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
          }
          
          .breakdown-section {
            margin-bottom: 20px;
          }
          
          .breakdown-section h4 {
            color: #374151;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 4px;
          }
          
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          
          .breakdown-table th,
          .breakdown-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
          }
          
          .breakdown-table th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
          }
          
          .breakdown-table td {
            color: #1f2937;
          }
          
          .amount {
            text-align: right;
            font-weight: 500;
          }
          
          .total-section {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #0ea5e9;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 16px;
          }
          
          .total-row:last-child {
            margin-bottom: 0;
            border-top: 1px solid #0ea5e9;
            padding-top: 8px;
            font-weight: 700;
            font-size: 18px;
            color: #0c4a6e;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          
          .signature-box {
            text-align: center;
            border-top: 1px solid #d1d5db;
            padding-top: 20px;
          }
          
          .signature-line {
            width: 200px;
            height: 1px;
            background: #d1d5db;
            margin: 40px auto 10px;
          }
          
          .signature-label {
            font-weight: 500;
            color: #374151;
          }
          
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            
            .header,
            .employee-info,
            .salary-breakdown,
            .total-section,
            .signature-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALARY SLIP</h1>
          <p>${monthName} ${year}</p>
        </div>
        
        <div class="employee-info">
          <div class="info-section">
            <h3>Employee Information</h3>
            <div class="info-row">
              <span class="info-label">Employee Name:</span>
              <span class="info-value">${employee.full_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Employee ID:</span>
              <span class="info-value">${employee.employee_id || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span class="info-value">${employee.department || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Designation:</span>
              <span class="info-value">${employee.designation || 'N/A'}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Salary Period</h3>
            <div class="info-row">
              <span class="info-label">Month:</span>
              <span class="info-value">${monthName} ${year}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Working Days:</span>
              <span class="info-value">${salarySlip.total_working_days}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Actual Working Days:</span>
              <span class="info-value">${salarySlip.actual_working_days}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Unpaid Leaves:</span>
              <span class="info-value">${salarySlip.unpaid_leaves || 0}</span>
            </div>
          </div>
        </div>
        
        <div class="salary-breakdown">
          <h3>Salary Breakdown</h3>
          
          <div class="breakdown-section">
            <h4>Basic Salary</h4>
            <table class="breakdown-table">
              <tr>
                <th>Component</th>
                <th class="amount">Amount (₹)</th>
              </tr>
              <tr>
                <td>Basic Salary</td>
                <td class="amount">${salarySlip.basic_salary?.toLocaleString() || '0'}</td>
              </tr>
            </table>
          </div>
          
          ${additions.length > 0 ? `
            <div class="breakdown-section">
              <h4>Additions</h4>
              <table class="breakdown-table">
                <tr>
                  <th>Component</th>
                  <th class="amount">Amount (₹)</th>
                </tr>
                ${additions.map(addition => `
                  <tr>
                    <td>${addition.component_name}</td>
                    <td class="amount">${addition.amount?.toLocaleString() || '0'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          
          ${deductions.length > 0 ? `
            <div class="breakdown-section">
              <h4>Deductions</h4>
              <table class="breakdown-table">
                <tr>
                  <th>Component</th>
                  <th class="amount">Amount (₹)</th>
                </tr>
                ${deductions.map(deduction => `
                  <tr>
                    <td>${deduction.component_name}</td>
                    <td class="amount">${deduction.amount?.toLocaleString() || '0'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
        </div>
        
        <div class="total-section">
          <div class="total-row">
            <span>Gross Salary:</span>
            <span>₹${salarySlip.gross_salary?.toLocaleString() || '0'}</span>
          </div>
          <div class="total-row">
            <span>Total Additions:</span>
            <span>₹${salarySlip.total_additions?.toLocaleString() || '0'}</span>
          </div>
          <div class="total-row">
            <span>Total Deductions:</span>
            <span>₹${salarySlip.total_deductions?.toLocaleString() || '0'}</span>
          </div>
          <div class="total-row">
            <span>Net Salary:</span>
            <span>₹${salarySlip.net_salary?.toLocaleString() || '0'}</span>
          </div>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Employee Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Authorized Signature</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
      </body>
    </html>
  `
}

module.exports = {
  generateSalarySlipPDF,
  generateSalarySlipHTML
}
