const express = require('express');
const xss = require('xss');
const path = require('path');
const foldersService = require('./folders-service');

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
  id: folder.id,
  folder_name: xss(folder.folder_name)
});

foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    foldersService
      .getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const {folder_name} = req.body;
    const newFolder = {folder_name: folder_name};

    if (!folder_name) {
      return res.status(400).json({
        error: {message: `Missing folder_name in request body`}
      });
    }


    foldersService
      .insertFolder(req.app.get('db'), newFolder)
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    foldersService
      .getFolderById(req.app.get('db'), req.params.folder_id)
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder not found` }
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    foldersService
      .deleteFolder(req.app.get('db'), req.params.folder_id)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const {folder_name} = req.body;
    const folderUpdateInfo = {folder_name: folder_name};

    if (!folder_name) {
      return res.status(400).json({
        error: { message: `Request must contain folder_name` }
      });
    }

    foldersService
      .updateFolder(req.app.get('db'), req.params.folder_id, folderUpdateInfo)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;
