
import React, { useState, useEffect } from 'react';
import { Student, Comment } from './types';
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  };

  const saveEdit = (studentId: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, comments: s.comments.map(c => c.id === editingCommentId ? { ...c, text: editText } : c) }
        : s
    ));
    setEditingCommentId(null);
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

  const copySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      alert("Synthèse copiée dans le presse-papier !");
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfb]">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Espace Professeur</h1>
          </div>
          {selectedStudentId && (
            <Button variant="ghost" className="text-white hover:bg-emerald-600" onClick={() => { setSelectedStudentId(null); setSummary(null); }}>
              ← Liste des élèves
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8">
        {!selectedStudentId ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Suivi des élèves</h2>
                <p className="text-gray-500 mt-1">Gérez vos élèves en difficulté et préparez vos bilans.</p>
              </div>
              <Button onClick={() => setIsAddingStudent(true)} variant="primary" size="lg">
                <span className="mr-2 text-xl">+</span> Nouvel Élève
              </Button>
            </div>

            {isAddingStudent && (
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-emerald-50 ring-1 ring-emerald-900/5">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Informations de l'élève</h3>
                <form onSubmit={addStudent} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom et Nom</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all" 
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Classe / Groupe</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all" 
                        value={newStudentClass}
                        onChange={e => setNewStudentClass(e.target.value)}
                        placeholder="3ème B"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" variant="primary">Ajouter l'élève</Button>
                    <Button type="button" variant="secondary" onClick={() => setIsAddingStudent(false)}>Annuler</Button>
                  </div>
                </form>
              </div>
            )}

            {students.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">C'est bien calme ici...</h3>
                <p className="text-gray-500 mt-2 max-w-xs mx-auto">Commencez par ajouter votre premier élève pour débuter le suivi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(student => (
                  <div 
                    key={student.id} 
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer flex flex-col group relative overflow-hidden"
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{student.name}</h3>
                        <p className="text-emerald-600 text-sm font-bold mt-1 uppercase tracking-wide">{student.className || 'Sans classe'}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteStudent(student.id); }}
                        className="text-gray-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-sm relative z-10">
                      <div className="flex items-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span className="font-medium text-gray-500">{student.comments.length} observation{student.comments.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center">
                        Consulter <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Student Profile Header */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-bold text-2xl">
                  {selectedStudent?.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{selectedStudent?.name}</h2>
                  <p className="text-emerald-600 font-bold text-lg">{selectedStudent?.className}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button 
                  variant="primary" 
                  onClick={handleGenerateSummary}
                  isLoading={isGeneratingSummary}
                  className="flex-1 md:flex-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m10 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2z" />
                  </svg>
                  Préparer la réunion
                </Button>
              </div>
            </div>

            {/* Summary Block */}
            {summary && (
              <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden ring-4 ring-emerald-500/10">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                  <button onClick={copySummary} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors" title="Copier">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <button onClick={() => setSummary(null)} className="bg-white/10 hover:bg-rose-500/30 p-2 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-xl font-bold text-emerald-200 mb-6 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Synthèse trimestrielle (IA)
                </h3>
                <div className="prose prose-invert max-w-none text-emerald-50 leading-relaxed text-lg whitespace-pre-wrap font-medium">
                  {summary}
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                   <Button variant="success" onClick={copySummary} className="bg-emerald-500 hover:bg-emerald-400">
                     Copier pour mon rapport
                   </Button>
                </div>
              </div>
            )}

            {/* Audio Recorder Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mr-3 text-sm">🎙️</span>
                Nouvelle observation
              </h3>
              <AudioRecorder onTranscriptionComplete={handleTranscription} isLoading={isTranscribing} />
            </div>

            {/* Comments Timeline */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-xl font-bold text-gray-900">Historique des séances</h3>
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">{selectedStudent?.comments.length} entrée(s)</span>
              </div>
              
              {selectedStudent?.comments.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-medium">
                  Aucun commentaire. Dictée une observation pour commencer.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedStudent?.comments.map(comment => (
                    <div key={comment.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group transition-all hover:border-emerald-200">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">
                            {new Date(comment.timestamp).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => startEditing(comment)}
                            className="text-gray-400 hover:text-emerald-600 p-2 rounded-lg hover:bg-emerald-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => deleteComment(selectedStudent.id, comment.id)}
                            className="text-gray-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div className="space-y-3">
                          <textarea 
                            className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-800 leading-relaxed font-medium"
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(selectedStudent.id)}>Enregistrer</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingCommentId(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 leading-relaxed text-lg font-medium italic pl-4 border-l-4 border-emerald-100">
                          "{comment.text}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 text-center border-t border-gray-100">
        <p className="text-gray-400 text-sm font-medium">Assistant Pédagogique Intelligent &copy; {new Date().getFullYear()}</p>
        <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-bold">Optimisé par Gemini Flash 3</p>
      </footer>
    </div>
  );
};

export default App;
