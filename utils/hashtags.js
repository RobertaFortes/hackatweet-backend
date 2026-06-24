const extractHashtags = (content) =>
  [...new Set(
    (content.match(/#(\w+)/g) || []).map(tag => tag.slice(1).toLowerCase())
  )];

module.exports = { extractHashtags };