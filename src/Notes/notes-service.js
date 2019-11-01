const NotesService = {
  getAllNotes(knex) {
    return knex
      .select('*')
      .from('noteful_notes');
  },
  //insert
  insertNote(knex, newNote) {
    return knex
      .insert(newNote)
      .into('noteful_notes')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  getNoteById(knex, id) {
    return knex
      .from('noteful_notes')
      .select('*')
      .where('id', id)
      .first();
  },
  deleteNote(knex, id) {
    return knex('noteful_notes')
      .where({ id })
      .delete();
  },
  updateNote(knex, id, newNoteInfo) {
    return knex('noteful_notes')
      .where({ id })
      .update(newNoteInfo);
  }
};

module.exports = NotesService;
