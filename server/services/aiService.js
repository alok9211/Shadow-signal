const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class AIService {
  async generateSpyWordPair(mainWord) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Given the word "${mainWord}", suggest ONE similar but distinct word that a spy could use to blend in. 
        
Requirements:
- Must be related but clearly different
- Should allow the spy to describe it ambiguously
- Return ONLY the single word, nothing else

Example: If mainWord is "Beach", return "Island"`
      }]
    });
    
    return response.content[0].text.trim();
  }

  async generateHint(word, playerDescriptions) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Players are describing the word "${word}". Here are their descriptions:
${playerDescriptions.join('\\n')}

Generate a subtle hint (1 sentence) that helps players without giving away the answer.`
      }]
    });
    
    return response.content[0].text.trim();
  }
}

module.exports = new AIService();