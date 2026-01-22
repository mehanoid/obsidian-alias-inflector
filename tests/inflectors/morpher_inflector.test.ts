import {MorpherInflector} from '../../src/inflectors';

beforeEach(() => {
  fetchMock.resetMocks();
});

describe('MorpherInflector', () => {
  let inflector: MorpherInflector;

  beforeEach(() => {
    inflector = new MorpherInflector();
  });

  it('returns an empty array when there is a message in the response', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({message: 'Error Message'}));

    const inflections = await inflector.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual([]);
  });


  it('adds an error message when there is a message in the response', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({message: 'Error Message'}));

    const inflector = new MorpherInflector();
    await inflector.getInflections('стол', {includePlural: true});

    expect(inflector.errors).toContain('Could not get inflections for "стол": Error Message');
  });

  it('returns inflections when the response is successful', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      "Р": "стола",
      "множественное": {
        "И": "столы",
      }
    }));

    const inflections = await inflector.getInflections('стол', {includePlural: true});
    expect(inflections).toEqual(["стола", "столы"]);
  });

  it('does not return plural inflections when includePlural is false', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      "Р": "стола",
      "множественное": {
        "И": "столы",
      }
    }));

    const inflections = await inflector.getInflections('стол', {includePlural: false});
    expect(inflections).toEqual(["стола"]);
  });
});

