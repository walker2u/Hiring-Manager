function extractEmailFromHeader(headerValue) {
    if (!headerValue) return null;
    const emailMatch = headerValue.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
        return emailMatch[1];
    }
    if (headerValue.includes('@')) {
        return headerValue.trim();
    }
    return null;
}

module.exports = { extractEmailFromHeader };