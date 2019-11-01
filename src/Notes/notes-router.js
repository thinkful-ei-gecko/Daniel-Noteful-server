const express = require('express');
const xss = require('xss');
const path = require('path');
const notesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  note_name: xss(note.note_name),
  content: xss(note.content),
  folder_id: note.folder_id,
  date_created: note.date_created
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    notesService
      .getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { note_name, content, folder_id } = req.body;
    const newNote = { note_name, content, folder_id };

    for (const [key, value] of Object.entries(newNote))
      if ((value == null))
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });

    notesService
      .insertNote(req.app.get('db'), newNote)
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note));
      })
      .catch(next);
  });

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    notesService
      .getNoteById(req.app.get('db'), req.params.note_id)
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `note not found` }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    notesService
      .deleteNote(req.app.get('db'), req.params.note_id)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const {note_name, content, folder_id } = req.body.updatedNote;
    const updatedNote = { note_name, content, folder_id };
    const numberOfValues = Object.values(updatedNote).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: { message: `Request must contain name, content, or folder_id` }
      });
    }

    notesService
      .updateNote(req.app.get('db'), req.params.note_id, updatedNote)
      .then(note => {
        res.status(204).json(note);
      })
      .catch(next);
  });

module.exports = notesRouter;
