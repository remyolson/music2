import { MusicDataSchema } from './schemas.js';

export function validate(jsonString) {
  let parsedData;

  try {
    parsedData = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      error: `JSON Syntax Error: ${error.message}`
    };
  }

  const result = MusicDataSchema.safeParse(parsedData);

  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });

    return {
      success: false,
      error: `Validation Error:\n${errors.join('\n')}`
    };
  }

  return {
    success: true,
    data: result.data
  };
}

export function formatErrorForDisplay(error) {
  const lines = error.split('\n');
  return lines.map(line => {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = line;
    return div;
  });
}