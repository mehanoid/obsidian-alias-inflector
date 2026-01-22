import {Inflector} from './base';

export class OpenAIInflector extends Inflector {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(apiKey = '', apiUrl = 'https://api.openai.com/v1', model = 'gpt-3.5-turbo') {
    super();
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
  }

  async getInflections(phrase: string, {includePlural = true}: any): Promise<string[]> {
    try {
      const prompt = this.buildPrompt(phrase, includePlural);
      const message = await this.callOpenAIAPI(prompt);
      const inflections = this.parseInflections(message);
      return inflections;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(`Could not get inflections for "${phrase}": ${errorMessage}`);
      return [];
    }
  }

  private buildPrompt(phrase: string, includePlural: boolean): string {
    const pluralInstruction = includePlural 
      ? 'Include both singular and plural forms if applicable.'
      : 'Focus only on singular forms.';

    return `You are a Russian language expert. Provide grammatical inflections (different cases) for the Russian word or phrase "${phrase}".
${pluralInstruction}
Return ONLY a JSON object. If the input is a valid Russian word or phrase, return an object with an array of inflections under the key "inflections". Do not include the original word.
If the input is not recognized as Russian or is invalid, return an error object with a "error" field explaining why.
Success format: {"inflections": ["word1", "word2", "word3"]}
Error format: {"error": "Description of why this cannot be inflected"}
Provide at least 2-4 different inflections for valid input.`;
  }

  private async callOpenAIAPI(prompt: string): Promise<string> {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Only add Authorization header if API key is provided
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetchWithTimeout(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      timeout: 15000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseInflections(message: string): string[] {
    try {
      // Try to extract JSON from the message
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Check if response contains an error
      if (parsed.error) {
        throw new Error(parsed.error);
      }

      const inflections = parsed.inflections || [];

      if (!Array.isArray(inflections)) {
        throw new Error('Inflections is not an array');
      }

      if (inflections.length === 0) {
        throw new Error('No inflections returned');
      }

      // Filter out empty strings and duplicates
      const filtered = Array.from(new Set(
        inflections.filter((v: any) => typeof v === 'string' && v.trim())
      ));

      return filtered;
    } catch (error) {
      throw new Error(`Failed to parse inflections: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchWithTimeout(
    resource: string,
    options: {method: string; headers: any; body: string; timeout: number} = {
      method: 'GET',
      headers: {},
      body: '',
      timeout: 15000,
    }
  ) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options.timeout);

    const response = await fetch(resource, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    clearTimeout(id);

    return response;
  }
}
