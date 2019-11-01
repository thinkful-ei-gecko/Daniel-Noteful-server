const knex = require('knex');
const app = require('../src/app');
const {makeNotes, makeMaliciousNote, expectedNotes, expectedNote} = require('./notes.fixtures')
const {makeFolders} = require('./folders.fixtures')


describe('Notes Endpoints', function() {
  let db;

  const testFolders = makeFolders()
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () =>
    db.raw(
      'TRUNCATE noteful_notes   RESTART IDENTITY CASCADE'
    )
  );

  beforeEach('insertFolders', () => {
    return db.into('noteful_folders').insert(testFolders)
  })

  afterEach('cleanup', () =>
    db.raw(
      'TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'
    )
  );

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, []);
      });
    });

    context('Given there are notes in the database', () => {
      const testNotes = makeNotes();
      const expected = expectedNotes();

      beforeEach('add notes', () => {
        return db
          .into('noteful_notes')
          .insert(testNotes)

      });

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, expected);
      });
    });

    context(`Given an XSS attack note`, () => {
      const { maliciousNote, cleanedNote } = makeMaliciousNote();

      beforeEach('insert malicious note', () => {
        return db
          .into('noteful_notes')
          .insert(maliciousNote)
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].note_name).to.eql(cleanedNote.note_name);
            expect(res.body[0].content).to.eql(cleanedNote.content);
          });
      });
    });
  });

  describe(`GET /api/notes/:note_id`, () => {
    context(`if no notes`, () => {
      it(`Gives a 404`, () => {
        const id = 7984;
        return supertest(app)
          .get(`/api/notes/${id}`)
          .expect(404, { error: { message: `note not found` } });
      });
    });

    context('If there are notes... ', () => {
      const testNotes = makeNotes();
      const expected = expectedNote();
 
      beforeEach('Add notes', () => {
        return db
          .into('noteful_notes')
          .insert(testNotes)
      });

      it('sends us the note with 200', () => {
        const id = 2;
        return supertest(app)
          .get(`/api/notes/${id}`)
          .expect(200, expected);
      });
    });
  });

  describe(`POST /api/notes`, () => {

    it(`creates a note, responding with 201 and the new note`, () => {
      const newNote = {
      note_name: 'newNote',
      content: 'newContent',
      folder_id: 2,
      };
      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.note_name).to.eql(newNote.note_name);
          expect(res.body.content).to.eql(newNote.content);
          expect(res.body.folder_id).to.eql(newNote.folder_id);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
        })
        .then(res =>
          supertest(app)
            .get(`/api/notes/${res.body.id}`)
            .expect(res.body)
        );
    });

    const requiredFields = ['note_name', 'content', 'folder_id'];

    requiredFields.forEach(field => {
      const newNote = {
        note_name: 'new name',
        content: 'This is a test',
        folder_id: 1
      };

      it(`responds with 400 when fields are missing`, () => {
        delete newNote[field];

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    it('removes XSS attack content from response', () => {
      const { maliciousNote, cleanedNote } = makeMaliciousNote();
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .expect(201)
        .expect(res => {
          expect(res.body.note_name).to.eql(cleanedNote.note_name);
          expect(res.body.content).to.eql(cleanedNote.content);
        });
    });
  });

  describe(`DELETE /api/notes/:note_id`, () => {
    context(`if no notes`, () => {
      it(`responds with 404`, () => {
        const id = 9874;
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(404, { error: { message: `note not found` } });
      });
    });

    context('Given there are notes in the database', () => {
      const testNotes = makeNotes();

      beforeEach('insert notes', () => {
        return db
          .into('noteful_notes')
          .insert(testNotes)
      });

      it('Deletes the note successfully', () => {
        const id = 2;
        const expected = testNotes.filter(
          note => note.id !== id
        );
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes`)
              .expect(expected)
          );
      });
    });
  });

  describe(`PATCH /api/notes/:note_id`, () => {
    context(`If no notes`, () => {
      it(`responds with 404`, () => {
        const id = 5846;
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(404, { error: { message: `note not found` } });
      });
    });

    context('Given there are notes in the database', () => {
      const testNotes = makeNotes();

      beforeEach('insert notes', () => {
        return db
          .into('noteful_notes')
          .insert(testNotes)
      });

      it('Updates the note succesfully', () => {
        const id = 2;
        const testNote = {
          updatedNote : {
          note_name: 'updatedName',
          content: 'updatedcontent',
          folder_id: 2
          }
        };
        const expected = {
          ...testNotes[id - 1],
          ...testNote.updatedNote
        };
        return supertest(app)
          .patch(`/api/notes/${id}`)
          .send(testNote)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${id}`)
              .expect(expected)
          );
      });

      it(`If no fields given, responds with 400`, () => {
        const id = 2;
        return supertest(app)
          .patch(`/api/notes/${id}`)
          .send({ updatedNote: { nonsense: 'boosh' }})
          .expect(400, {
            error: {
              message: `Request must contain name, content, or folder_id`
            }
          });
      });

      it(`responds with 204 when updating only a subset of fields`, () => {
        const id = 2;
        const testNote = {
          updatedNote : {
          note_name: 'updatedName'
          }
        };
        const expected = {
          ...testNotes[id - 1],
          ...testNote.updatedNote
        };

        return supertest(app)
          .patch(`/api/notes/${id}`)
          .send({
            ...testNote,
            nonsense: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${id}`)
              .expect(expected)
          );
      });
    });
  });
});
