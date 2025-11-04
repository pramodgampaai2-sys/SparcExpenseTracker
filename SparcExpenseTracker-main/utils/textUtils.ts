export const sanitizeSmsText = (text: string): string => {
  if (!text) return '';
  // This function is designed to clean up text copied from mobile devices (especially iOS)
  // which can introduce non-standard characters that confuse the AI model.
  return text
    // First, handle all forms of newlines and carriage returns, converting them to a single space.
    // This is crucial for handling platform-specific line endings (CRLF, LF, CR).
    .replace(/(\r\n|\n|\r)/gm, " ")
    // Replace various smart quotes and apostrophes with standard ones
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace en and em dashes with a standard hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Remove zero-width spaces, byte order mark, and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Standardize all remaining whitespace (including non-breaking spaces) to a single space
    .trim()
    .replace(/\s+/g, ' ');
};
