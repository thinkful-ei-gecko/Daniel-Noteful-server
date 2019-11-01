function makeNotes() {
  return [
    {
      id: 1,
      note_name: 'toDo',
      content: 'All the things',
      folder_id: 1,
    },
    {
      id: 2, 
      note_name: 'shopping list',
      content: 'Get beer',
      folder_id: 1,
    },
    {
      id: 3,
      note_name: 'Burn List',
      content: 'Everything',
      folder_id: 1,
    }
  ];
}

function expectedNotes() {
  return [
    {
      id: 1,
      note_name: 'toDo',
      content: 'All the things',
      folder_id: 1,
    },
    {
      id: 2,
      note_name: 'shopping list',
      content: 'Get beer',
      folder_id: 1,
    },
    {
      id: 3,
      note_name: 'Burn List',
      content: 'Everything',
      folder_id: 1,
    }
  ];
}

function expectedNote() {
  return {
    id: 2,
    note_name: 'shopping list',
    content: 'Get beer',
    folder_id: 1,
  }
}

function makeMaliciousNote() {
  const maliciousNote = {
    note_name: 'HACKIN IT UP <script>alert("xss")</script>',
    content: 'TestTestTest',
    folder_id: 1
  };

  const cleanedNote = {
    ...maliciousNote,
    note_name: 'HACKIN IT UP &lt;script&gt;alert("xss")&lt;/script&gt;',
  };

  return {
    maliciousNote,
    cleanedNote
  };
}


module.exports = {
  makeNotes,
  expectedNotes,
  expectedNote,
  makeMaliciousNote
};
