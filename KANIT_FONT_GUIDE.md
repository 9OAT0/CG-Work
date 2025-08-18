# Kanit Font Implementation Guide

## Overview
This project now uses Kanit font as the primary typeface, implementing the specifications from your design requirements. The font system is fully integrated with Tailwind CSS for easy usage throughout the application.

## Font Specifications Implemented

### 1. Kanit 34 Regular (หัวข้อใหญ่สุด)
- **Usage**: Main headers, primary titles
- **Class**: `text-header-main` or `text-kanit-34`
- **Example**: `<h1 className="text-header-main">Main Title</h1>`

### 2. Kanit 24 Regular (หัวข้อกลาง/หนวดกบี/Brain Bang)
- **Usage**: Sub headers, section titles, Brain Bang branding
- **Class**: `text-header-sub` or `text-kanit-24`
- **Example**: `<h2 className="text-header-sub">Section Title</h2>`

### 3. Kanit 24 Light (Button)
- **Usage**: Button text, call-to-action elements
- **Class**: `text-button` or `text-kanit-24-light`
- **Example**: `<button className="text-button">Click Me</button>`

### 4. Kanit 18 Light (ช่องพิมพ์ข้อความ)
- **Usage**: Input fields, form elements
- **Class**: `text-input` or `text-kanit-18`
- **Example**: `<input className="text-input" placeholder="Enter text" />`

### 5. Kanit 18 Light (ข้อความ***)
- **Usage**: Body text, content paragraphs
- **Class**: `text-content` or `text-kanit-18-content`
- **Example**: `<p className="text-content">Body content here</p>`

### 6. Kanit 16 Regular (ชื่อผลงาน)
- **Usage**: Work names, project titles, labels
- **Class**: `text-work-name` or `text-kanit-16`
- **Example**: `<span className="text-work-name">Project Name</span>`

### 7. Kanit 16 Light (ข้อมูลต่างๆ/ช่องค้นหา)
- **Usage**: General information, search fields, metadata
- **Class**: `text-info` or `text-kanit-16-light`
- **Example**: `<div className="text-info">Additional info</div>`

## Usage Examples

### Component Example
```jsx
function ExampleComponent() {
  return (
    <div className="font-kanit">
      <h1 className="text-header-main">Main Title</h1>
      <h2 className="text-header-sub">Brain Bang Section</h2>
      
      <button className="text-button bg-blue-500 px-4 py-2 rounded">
        Submit
      </button>
      
      <input 
        className="text-input border p-2 rounded" 
        placeholder="Search here..."
      />
      
      <p className="text-content">
        This is the main content paragraph with proper typography.
      </p>
      
      <div className="text-work-name font-medium">
        Project Title
      </div>
      
      <span className="text-info text-gray-600">
        Additional information
      </span>
    </div>
  );
}
```

### Direct Tailwind Classes
You can also use the font sizes directly:
```jsx
<div className="text-kanit-34 font-kanit">Large Header</div>
<div className="text-kanit-24 font-kanit">Medium Header</div>
<div className="text-kanit-18 font-kanit font-light">Light Text</div>
```

## Font Weights Available
- **300**: Light (font-light)
- **400**: Regular (font-normal)
- **500**: Medium (font-medium)
- **600**: Semi-bold (font-semibold)

## Mobile Responsiveness
All font sizes are optimized for mobile devices as specified in your requirements. The line heights and spacing are automatically adjusted for better readability.

## Implementation Details

### Files Modified:
1. **src/app/layout.tsx**: Added Kanit font import from Google Fonts
2. **tailwind.config.js**: Added custom font sizes and Kanit font family
3. **src/app/globals.css**: Added utility classes and font variables

### Font Loading:
- Fonts are loaded from Google Fonts with Thai and Latin subsets
- Display swap is enabled for better performance
- Font weights 300, 400, 500, and 600 are preloaded

## Best Practices

1. **Use semantic classes**: Prefer `text-header-main` over `text-kanit-34` for better maintainability
2. **Consistent usage**: Use the appropriate class for each content type as specified
3. **Fallback fonts**: The system includes fallback fonts for better compatibility
4. **Performance**: Fonts are optimized with display: swap for better loading performance

## Migration from Previous Fonts

If you need to update existing components:
1. Replace `font-sans` with `font-kanit`
2. Update text size classes to use the new Kanit specifications
3. Adjust font weights as needed (light = 300, regular = 400)

## Support for Thai Language

The Kanit font includes full Thai language support with proper character rendering and spacing optimized for both Thai and English text.
