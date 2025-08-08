const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireHR, validateCompanyAccess } = require('../middleware/auth');
const documentController = require('../controllers/documentController');

const router = express.Router();

// Validation middleware
const validateCreateTemplate = [
  body('document_name').trim().isLength({ min: 2 }).withMessage('Document name must be at least 2 characters'),
  body('field_tags').isArray({ min: 1 }).withMessage('At least one field tag is required'),
  body('field_tags.*.tag').notEmpty().withMessage('Field tag is required'),
  body('field_tags.*.label').notEmpty().withMessage('Field label is required'),
  body('content').notEmpty().withMessage('Document content is required')
];

const validateUpdateTemplate = [
  body('document_name').trim().isLength({ min: 2 }).withMessage('Document name must be at least 2 characters'),
  body('field_tags').isArray({ min: 1 }).withMessage('At least one field tag is required'),
  body('field_tags.*.tag').notEmpty().withMessage('Field tag is required'),
  body('field_tags.*.label').notEmpty().withMessage('Field label is required'),
  body('content').notEmpty().withMessage('Document content is required')
];

const validateGenerateDocument = [
  body('template_id').notEmpty().withMessage('Template ID is required'),
  body('field_values').isObject().withMessage('Field values must be an object')
];

// Apply authentication to all routes
router.use(authenticateToken);

// Document template routes (HR only)
router.get('/templates', requireHR, documentController.getDocumentTemplates);
router.get('/templates/:id', requireHR, documentController.getDocumentTemplate);
router.post('/templates', requireHR, validateCreateTemplate, documentController.createDocumentTemplate);
router.put('/templates/:id', requireHR, validateUpdateTemplate, documentController.updateDocumentTemplate);
router.delete('/templates/:id', requireHR, documentController.deleteDocumentTemplate);

// Generate document from template (HR only)
router.post('/generate', requireHR, validateGenerateDocument, documentController.generateDocument);

module.exports = router; 