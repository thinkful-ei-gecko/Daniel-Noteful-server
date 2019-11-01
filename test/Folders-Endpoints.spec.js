const knex = require('knex');
const app = require('../src/app');
const { makeFolders } = require('./folders.fixtures');
//make the fixtures

describe('Folders Endpoint', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clear tables', () =>
    db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE')
  );

  afterEach('Clean up tables', () =>
    db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE')
  );

  describe(`Get/api/folders`, () => {
    context(`Given no folders`, () => {
      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, []);
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFolders();

      beforeEach('insert folders', () => {
        return db.into('noteful_folders').insert(testFolders);
      });

      it(`Response: 200 and all folders`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders);
      });
    });
  });

  describe(`Get api/folders/folder_id`, () => {
    context(`given no folders`, () => {
      it('responds with 404', () => {
        const folderId = 65498731;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder not found` } });
      });
    });

    context(`given there are folders`, () => {
      const testFolders = makeFolders();

      beforeEach('insert folders', () =>
        db.into('noteful_folders').insert(testFolders)
      );

      it('Response: 200 and requested folder', () => {
        const folderId = 2;
        const expectedFolder = testFolders[folderId - 1];
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder);
      });
    });
  });

  describe('/POST /api/folders', () => {
    const testFolders = makeFolders();

    it('Creates a new folder, with 201 and a new Folder', () => {
      const newFolder = {
        folder_name: 'NEWFOLDER'
      };

      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
        })
        .then(res =>
          supertest(app)
            .get(`/api/folders/${res.body.id}`)
            .expect(res.body)
        );
    });

    const newFolder = {};
    it(`Gives a 400 and error when a field is missing`, () => {
      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(400, {
          error: { message: 'Missing folder_name in request body' }
        });
    });
  });

  describe(`Delete /api/folders/:folder_id`, () => {
    context(`If there are no folders`, () => {
      it(`Responds with 404`, () => {
        const folderId = 65;
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder not found` } });
      });
    });

    context('If there are folders... ', () => {
      const testFolders = makeFolders();

      beforeEach('add folders', () => {
        return db.into('noteful_folders').insert(testFolders);
      });

      it('deletes and gives 200', () => {
        const id = 2;
        const expectedFolder = testFolders.filter(folder => folder.id !== id);
        return supertest(app)
          .delete(`/api/folders/${id}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedFolder)
          );
      });
    });
  });

  describe(`PATCH /api/folders/:folder_id`, () => {
    context(`If no folders`, () => {
      it(`Gives a 404`, () => {
        const folderId = 7896;
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder not found` } });
      });
    });

    context('If folders... ', () => {
      const testFolders = makeFolders();

      beforeEach('add folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      });

      it('updates the folder name', () => {
        const id = 2;
        const updateFolderInfo = {
          folder_name: 'NewFolderName',
        };
        const expected = {
          ...testFolders[id - 1],
          ...updateFolderInfo
        };
        return supertest(app)
          .patch(`/api/folders/${id}`)
          .send(updateFolderInfo)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${id}`)
              .expect(expected)
          );
      });

      it(`Responds with 400 when fields aren't given`, () => {
        const id = 2;
        return supertest(app)
          .patch(`/api/folders/${id}`)
          .send({ wrongField: 'boosh' })
          .expect(400, {
            error: {
              message: `Request must contain folder_name`
            }
          });
      });
    });
  });
});
