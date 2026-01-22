import {OpenAIInflector} from '../../src/inflectors';

describe('OpenAIInflector', () => {
  let inflector: OpenAIInflector;

  beforeEach(() => {
    inflector = new OpenAIInflector('test-api-key', 'https://api.openai.com/v1', 'gpt-3.5-turbo');
  });

  it('returns an empty array when API key is not configured', async () => {
    const inflectorNoKey = new OpenAIInflector('');
    const inflections = await inflectorNoKey.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual([]);
  });

  it('adds an error message when API key is not configured', async () => {
    const inflectorNoKey = new OpenAIInflector('');
    await inflectorNoKey.getInflections('стол', {includePlural: true});
    expect(inflectorNoKey.errors).toContain('OpenAI API key is not configured');
  });

  it('returns inflections when API response is successful', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола", "столу", "столом", "столе"]}'
          }
        }
      ]
    }));

    const inflections = await inflector.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual(["стола", "столу", "столом", "столе"]);
  });

  it('handles API response with extra text around JSON', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: 'Here are the inflections: {"inflections": ["кота", "коту", "котом"]} Done.'
          }
        }
      ]
    }));

    const inflections = await inflector.getInflections('кот', {includePlural: true});
    expect(inflections).toEqual(["кота", "коту", "котом"]);
  });

  it('removes duplicate inflections', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола", "стола", "столу", "столу"]}'
          }
        }
      ]
    }));

    const inflections = await inflector.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual(["стола", "столу"]);
  });

  it('adds an error message when API returns an error', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      error: {
        message: 'Invalid API key'
      }
    }), {status: 401});

    await inflector.getInflections('стол', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('Could not get inflections for "стол"');
  });

  it('adds an error message when API response has invalid JSON', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: 'No JSON here'
          }
        }
      ]
    }));

    await inflector.getInflections('стол', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('Could not get inflections for "стол"');
  });

  it('filters out empty strings from inflections', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола", "", "столу", "  "]}'
          }
        }
      ]
    }));

    const inflections = await inflector.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual(["стола", "столу"]);
  });

  it('handles includePlural option in prompt', async () => {
    const mockResponse = JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола", "столу"]}'
          }
        }
      ]
    });
    fetchMock.mockResponseOnce(mockResponse);

    await inflector.getInflections('стол', {includePlural: false});

    // Check that fetch was called
    expect(fetchMock).toHaveBeenCalled();

    // Check that the request body includes the correct model
    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);
    expect(body.messages[0].content).toContain('Focus only on singular forms');
  });

  it('sends correct API parameters to OpenAI', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола"]}'
          }
        }
      ]
    }));

    await inflector.getInflections('стол', {includePlural: true});

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        }),
      })
    );

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);
    expect(body.model).toBe('gpt-3.5-turbo');
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(200);
    expect(body.messages).toHaveLength(1);
  });

  it('handles network timeout errors', async () => {
    fetchMock.mockRejectOnce(new Error('AbortError'));

    await inflector.getInflections('стол', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
  });

  it('returns empty array when inflections field is not an array', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": "not an array"}'
          }
        }
      ]
    }));

    await inflector.getInflections('стол', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
  });

  it('works with different API URLs and models', async () => {
    const customInflector = new OpenAIInflector(
      'test-key',
      'https://api.example.com/v1',
      'gpt-4'
    );

    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": ["стола"]}'
          }
        }
      ]
    }));

    await customInflector.getInflections('стол', {includePlural: true});

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.any(Object)
    );

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.model).toBe('gpt-4');
  });

  it('handles error response from API (malformed phrase)', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"error": "Input is not recognized as Russian text"}'
          }
        }
      ]
    }));

    await inflector.getInflections('xyz123@#$', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('Input is not recognized as Russian text');
  });

  it('handles error response with custom error message', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"error": "Cannot inflect abbreviated form or acronym"}'
          }
        }
      ]
    }));

    await inflector.getInflections('NASA', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('Cannot inflect abbreviated form or acronym');
  });

  it('handles empty inflections array', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"inflections": []}'
          }
        }
      ]
    }));

    await inflector.getInflections('стол', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('No inflections returned');
  });

  it('prefers error field over empty inflections', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      choices: [
        {
          message: {
            content: '{"error": "This is a proper noun", "inflections": []}'
          }
        }
      ]
    }));

    await inflector.getInflections('Москва', {includePlural: true});
    expect(inflector.errors.length).toBeGreaterThan(0);
    expect(inflector.errors[0]).toContain('This is a proper noun');
  });
});
