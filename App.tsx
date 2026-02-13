
import React, { useState, useEffect, useCallback } from 'react';
import { Student, Comment, ViewState } from './types';
import { Button } from './components/Button';
import { AudioRecorder } from './components/AudioRecorder';
import { transcribeAudio, generateSummary } from './services/geminiService';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('students');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  const addStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: newStudentName,
      className: newStudentClass,
      notes: '',
      comments: [],
      createdAt: Date.now()
    };

    setStudents(prev => [...prev, newStudent]);
    setNewStudentName('');
    setNewStudentClass('');
    setIsAddingStudent(false);
  };

  const handleTranscription = async (base64Audio: string, blob: Blob) => {
    if (!selectedStudentId) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(base64Audio, 'audio/webm');
      const newComment: Comment = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        text: text,
      };

      setStudents(prev => prev.map(s => 
        s.id === selectedStudentId 
          ? { ...s, comments: [newComment, ...s.comments] }
          : s
      ));
    } catch (error) {
      alert("Échec de la transcription.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const deleteStudent = (id: string) => {
    if (confirm("Supprimer cet élève et tout son historique ?")) {
      setStudents(prev => prev.filter(s => s.id !== id));
      if (selectedStudentId === id) setSelectedStudentId(null);
    }
  };

  const deleteComment = (studentId: string, commentId: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, comments: s.comments.filter(c => c.id !== commentId) }
        : s
    ));
  };

  const handleGenerateSummary = async () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || student.comments.length === 0) {
      alert("Ajoutez des commentaires avant de générer une synthèse.");
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const result = await generateSummary(student.name, student.comments.map(c => c.text));
      setSummary(result);
    } catch (error) {
      alert("Erreur lors de la génération du résumé.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            <h1 className="text-xl font-bold">Suivi Élèves</h1>
          </div>
          {selectedStudentId && (
            <Button variant="ghost" className="text-white hover:bg-indigo-600" onClick={() => { setSelectedStudentId(null); setSummary(null); }}>
              ← Retour à la liste
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!selectedStudentId ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Mes Élèves en Difficulté</h2>
              <Button onClick={() => setIsAddingStudent(true)}>+ Ajouter un élève</Button>
            </div>

            {isAddingStudent && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
                <form onSubmit={addStudent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'élève</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                      value={newStudentName}
                      onChange={e => setNewStudentName(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classe / Groupe</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                      value={newStudentClass}
                      onChange={e => setNewStudentClass(e.target.value)}
                      placeholder="Ex: 3ème B"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Enregistrer</Button>
                    <Button type="button" variant="secondary" onClick={() => setIsAddingStudent(false)}>Annuler</Button>
                  </div>
                </form>
              </div>
            )}

            {students.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Aucun élève enregistré</h3>
                <p className="text-gray-500">Commencez par ajouter un élève à suivre.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.map(student => (
                  <div 
                    key={student.id} 
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
                        <p className="text-indigo-600 text-sm font-medium">{student.className || 'Sans classe'}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteStudent(student.id); }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-auto flex items-center text-xs text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {student.comments.length} commentaire(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Student Profile Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">{selectedStudent?.name}</h2>
                <p className="text-indigo-600 font-medium text-lg">{selectedStudent?.className}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={handleGenerateSummary}
                  isLoading={isGeneratingSummary}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
                  </svg>
                  Synthèse Trimestre
                </Button>
              </div>
            </div>

            {/* Summary Block */}
            {summary && (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <button onClick={() => setSummary(null)} className="text-amber-400 hover:text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Synthèse pour réunion
                </h3>
                <div className="prose prose-amber max-w-none text-amber-900 whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}

            {/* Audio Recorder Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Ajouter un commentaire vocal</h3>
              <AudioRecorder onTranscriptionComplete={handleTranscription} isLoading={isTranscribing} />
            </div>

            {/* Comments Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 px-2">Historique des séances</h3>
              {selectedStudent?.comments.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  Aucun commentaire enregistré pour cet élève.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStudent?.comments.map(comment => (
                    <div key={comment.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                          {new Date(comment.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <button 
                          onClick={() => deleteComment(selectedStudent.id, comment.id)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <p className="mt-2 text-gray-700 leading-relaxed italic">
                        "{comment.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 text-center text-gray-400 text-sm">
        Suivi Élèves &copy; {new Date().getFullYear()} - Optimisé par Gemini 3 Flash
      </footer>
    </div>
  );
};

export default App;
