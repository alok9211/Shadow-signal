const words = require('../data/words.json');

class WordService {
  getRandomWord() {
    const domain = words.domains[Math.floor(Math.random() * words.domains.length)];
    const wordObj = domain.words[Math.floor(Math.random() * domain.words.length)];
    
    return {
      domain: domain.name,
      mainWord: wordObj.word,
      similar: wordObj.similar
    };
  }
}

module.exports = new WordService();