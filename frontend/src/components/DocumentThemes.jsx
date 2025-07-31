import { X } from 'lucide-react'

const DocumentThemes = ({ onSelectTheme, onClose }) => {
  const themes = [
    {
      name: 'Offer Letter',
      description: 'Professional job offer letter template',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">{{company_name}}</h1>
            <p style="color: #7f8c8d; font-size: 16px;">{{company_address}}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 10px;"><strong>Date:</strong> {{current_date}}</p>
            <p style="margin-bottom: 10px;"><strong>To:</strong> {{candidate_name}}</p>
            <p style="margin-bottom: 10px;"><strong>Subject:</strong> Offer of Employment</p>
          </div>
          
          <div style="line-height: 1.6; margin-bottom: 30px;">
            <p>Dear {{candidate_name}},</p>
            
            <p>We are pleased to offer you the position of <strong>{{job_title}}</strong> at {{company_name}}.</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">Position Details:</h3>
            <ul style="margin-bottom: 20px;">
              <li><strong>Position:</strong> {{job_title}}</li>
              <li><strong>Department:</strong> {{department}}</li>
              <li><strong>Start Date:</strong> {{start_date}}</li>
              <li><strong>Salary:</strong> {{salary_amount}} per {{salary_period}}</li>
              <li><strong>Reporting To:</strong> {{reporting_manager}}</li>
            </ul>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">Benefits:</h3>
            <ul style="margin-bottom: 20px;">
              <li>Health insurance coverage</li>
              <li>Paid time off</li>
              <li>Professional development opportunities</li>
              <li>Retirement benefits</li>
            </ul>
            
            <p>Please review the attached employee handbook for complete details about our policies and procedures.</p>
            
            <p>To accept this offer, please sign and return this letter by {{acceptance_deadline}}.</p>
            
            <p>We look forward to having you join our team!</p>
            
            <p style="margin-top: 40px;">Sincerely,</p>
            <p><strong>{{hr_manager_name}}</strong><br>
            Human Resources Manager<br>
            {{company_name}}</p>
          </div>
        </div>
      `
    },
    {
      name: 'Letter of Recommendation',
      description: 'Professional recommendation letter template',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 10px;"><strong>Date:</strong> {{current_date}}</p>
            <p style="margin-bottom: 10px;"><strong>To:</strong> {{recipient_name}}</p>
            <p style="margin-bottom: 10px;"><strong>Subject:</strong> Letter of Recommendation for {{employee_name}}</p>
          </div>
          
          <div style="line-height: 1.6; margin-bottom: 30px;">
            <p>Dear {{recipient_name}},</p>
            
            <p>I am writing to provide a strong recommendation for {{employee_name}}, who worked as {{job_title}} at {{company_name}} from {{employment_start_date}} to {{employment_end_date}}.</p>
            
            <p>During {{employee_name}}'s tenure with our organization, {{he_she}} demonstrated exceptional {{key_skill_1}} and {{key_skill_2}}. {{He_she}} consistently delivered high-quality work and showed great initiative in {{specific_achievement}}.</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">Key Strengths:</h3>
            <ul style="margin-bottom: 20px;">
              <li>{{strength_1}}</li>
              <li>{{strength_2}}</li>
              <li>{{strength_3}}</li>
            </ul>
            
            <p>{{employee_name}} was a valuable team member who {{teamwork_description}}. {{He_she}} consistently met deadlines and exceeded expectations in {{specific_project}}.</p>
            
            <p>I have no hesitation in recommending {{employee_name}} for {{position_applied_for}}. {{He_she}} would be an asset to any organization.</p>
            
            <p>Please feel free to contact me if you need any additional information.</p>
            
            <p style="margin-top: 40px;">Sincerely,</p>
            <p><strong>{{recommender_name}}</strong><br>
            {{recommender_title}}<br>
            {{company_name}}<br>
            {{contact_email}}<br>
            {{contact_phone}}</p>
          </div>
        </div>
      `
    },
    {
      name: 'Employment Contract',
      description: 'Comprehensive employment contract template',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">EMPLOYMENT CONTRACT</h1>
            <p style="color: #7f8c8d; font-size: 16px;">{{company_name}}</p>
          </div>
          
          <div style="line-height: 1.6; margin-bottom: 30px;">
            <p><strong>This Employment Contract ("Contract") is entered into on {{contract_date}} between:</strong></p>
            
            <p><strong>{{company_name}}</strong> ("Employer")<br>
            {{company_address}}<br>
            And</p>
            
            <p><strong>{{employee_name}}</strong> ("Employee")<br>
            {{employee_address}}</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">1. POSITION AND DUTIES</h3>
            <p>The Employee shall serve as {{job_title}} and shall perform all duties and responsibilities associated with this position.</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">2. COMPENSATION</h3>
            <p>The Employee shall receive a salary of {{salary_amount}} per {{salary_period}}, payable {{payment_schedule}}.</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">3. WORK SCHEDULE</h3>
            <p>The Employee shall work {{work_hours}} hours per week, typically from {{work_start_time}} to {{work_end_time}}.</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">4. BENEFITS</h3>
            <p>The Employee shall be eligible for the following benefits:</p>
            <ul style="margin-bottom: 20px;">
              <li>{{benefit_1}}</li>
              <li>{{benefit_2}}</li>
              <li>{{benefit_3}}</li>
            </ul>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">5. TERMINATION</h3>
            <p>This employment may be terminated by either party with {{notice_period}} notice in writing.</p>
            
            <div style="margin-top: 40px; display: flex; justify-content: space-between;">
              <div>
                <p><strong>Employer Signature:</strong></p>
                <p>_________________________</p>
                <p>Date: {{employer_signature_date}}</p>
              </div>
              <div>
                <p><strong>Employee Signature:</strong></p>
                <p>_________________________</p>
                <p>Date: {{employee_signature_date}}</p>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      name: 'Performance Review',
      description: 'Employee performance review template',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">PERFORMANCE REVIEW</h1>
            <p style="color: #7f8c8d; font-size: 16px;">{{company_name}}</p>
          </div>
          
          <div style="line-height: 1.6; margin-bottom: 30px;">
            <div style="margin-bottom: 20px;">
              <p><strong>Employee Name:</strong> {{employee_name}}</p>
              <p><strong>Position:</strong> {{job_title}}</p>
              <p><strong>Department:</strong> {{department}}</p>
              <p><strong>Review Period:</strong> {{review_period}}</p>
              <p><strong>Reviewer:</strong> {{reviewer_name}}</p>
              <p><strong>Review Date:</strong> {{review_date}}</p>
            </div>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">PERFORMANCE RATINGS</h3>
            <p>Please rate the employee on a scale of 1-5 (1=Needs Improvement, 5=Excellent)</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Criteria</th>
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">Rating</th>
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Comments</th>
              </tr>
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{criteria_1}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">{{rating_1}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{comment_1}}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{criteria_2}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">{{rating_2}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{comment_2}}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{criteria_3}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">{{rating_3}}</td>
                <td style="border: 1px solid #dee2e6; padding: 10px;">{{comment_3}}</td>
              </tr>
            </table>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">STRENGTHS</h3>
            <p>{{strength_1}}</p>
            <p>{{strength_2}}</p>
            <p>{{strength_3}}</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">AREAS FOR IMPROVEMENT</h3>
            <p>{{improvement_1}}</p>
            <p>{{improvement_2}}</p>
            
            <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px;">GOALS FOR NEXT PERIOD</h3>
            <p>{{goal_1}}</p>
            <p>{{goal_2}}</p>
            <p>{{goal_3}}</p>
            
            <div style="margin-top: 40px;">
              <p><strong>Employee Signature:</strong> _________________________ Date: {{employee_signature_date}}</p>
              <p><strong>Reviewer Signature:</strong> _________________________ Date: {{reviewer_signature_date}}</p>
            </div>
          </div>
        </div>
      `
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Choose Document Theme</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {themes.map((theme, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelectTheme(theme.template)}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {theme.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {theme.description}
                </p>
                <div className="text-sm text-blue-600 font-medium">
                  Click to use this theme
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How to use themes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click on any theme to load it into the editor</li>
              <li>• Customize the content and add your own variables</li>
              <li>• Replace placeholder text with your specific information</li>
              <li>• Use the rich text editor to format and style your document</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentThemes 