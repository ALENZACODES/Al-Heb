// My Collection and the learner's own pages (code under src/collection/, fetched on demand).
export const COLLECTION_ROUTES = [['collection', 'collection', 'My Collection', 'more'], ['shelf', 'shelf', 'Reading Shelf', 'read'], ['timeline', 'timeline', 'My Timeline', 'progress'],
  ['my-hebrew', 'myhebrew', 'My Hebrew', 'progress'], ['paths', 'paths', 'Interest Paths', 'learn']]
  .map(([name, file, title, section]) => ({ name, pattern: '/' + name, module: `../collection/${file}.view.js`, title, owner: 'collection', optional: true, quick: `nav.route.${name}`, section }));
