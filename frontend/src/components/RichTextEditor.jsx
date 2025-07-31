import { useState, useRef, useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Type,
  Palette,
  ChevronDown
} from 'lucide-react'

const RichTextEditor = ({ content, onContentChange, fieldTags, onInsertPlaceholder }) => {
  const editorRef = useRef(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [selectedFontSize, setSelectedFontSize] = useState('16px')

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF', '#000080'
  ]

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current.focus()
    updateContent()
  }

  const updateContent = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const insertPlaceholder = (placeholder) => {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const textNode = document.createTextNode(`{{${placeholder}}}`)
      range.deleteContents()
      range.insertNode(textNode)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
      updateContent()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      execCommand('insertLineBreak')
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap items-center gap-1">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => execCommand('bold')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => execCommand('italic')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => execCommand('underline')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Underline"
          >
            <Underline size={16} />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => execCommand('justifyLeft')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => execCommand('justifyCenter')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => execCommand('justifyRight')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <button
            onClick={() => execCommand('justifyFull')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Justify"
          >
            <AlignJustify size={16} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => execCommand('insertUnorderedList')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => execCommand('insertOrderedList')}
            className="p-2 hover:bg-gray-200 rounded"
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        {/* Block Elements */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => execCommand('formatBlock', '<h1>')}
            className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => execCommand('formatBlock', '<h2>')}
            className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => execCommand('formatBlock', '<h3>')}
            className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
            title="Heading 3"
          >
            H3
          </button>
          <button
            onClick={() => execCommand('formatBlock', '<p>')}
            className="p-2 hover:bg-gray-200 rounded text-sm"
            title="Paragraph"
          >
            P
          </button>
        </div>

        {/* Font Size */}
        <div className="relative border-r border-gray-300 pr-2">
          <button
            onClick={() => setShowFontSize(!showFontSize)}
            className="p-2 hover:bg-gray-200 rounded flex items-center gap-1"
            title="Font Size"
          >
            <Type size={16} />
            <ChevronDown size={12} />
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              {fontSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    execCommand('fontSize', size)
                    setShowFontSize(false)
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="relative border-r border-gray-300 pr-2">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-200 rounded"
            title="Text Color"
          >
            <Palette size={16} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-2">
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      execCommand('foreColor', color)
                      setSelectedColor(color)
                      setShowColorPicker(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Variables */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600 mr-2">Variables:</span>
          {fieldTags.map((field) => (
            <button
              key={field.tag}
              onClick={() => insertPlaceholder(field.tag)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              title={`Insert ${field.label}`}
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="p-4 min-h-[400px] focus:outline-none prose max-w-none"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}

export default RichTextEditor 