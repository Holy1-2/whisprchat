import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, query, where, orderBy, 
  onSnapshot, addDoc, doc, getDoc, getDocs, deleteDoc 
} from 'firebase/firestore';
import { 
  MicrophoneIcon, PlayIcon, PauseIcon, TrashIcon,
  UserCircleIcon, ArrowLeftIcon, MinusIcon,ArrowUturnLeftIcon
} from '@heroicons/react/24/solid';
import { useParams, useNavigate } from 'react-router-dom';

const CLOUDINARY_CLOUD_NAME = 'dnzwjg4xp';
const CLOUDINARY_UPLOAD_PRESET = 'whispr';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

export default function ChatScreen() {
  const { currentUser } = useAuth();
  const { userId } = useParams();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const mediaRecorder = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch recipient data
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!userId) return navigate('/');
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setRecipient({ id: userDoc.id, ...userDoc.data() });
        } else {
          setError('User not found');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error) {
        setError('Failed to load conversation');
        console.error("Recipient fetch error:", error);
      }
    };
    fetchRecipient();
  }, [userId, navigate]);

  // Initialize chat session
  useEffect(() => {
    if (!currentUser?.uid || !recipient?.id) return;
    let unsubscribeChats = () => {};
    let unsubscribeMessages = () => {};
    
    const initializeChat = async () => {
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef, 
          where('participants', 'array-contains', currentUser.uid)
        );
        unsubscribeChats = onSnapshot(q, async (snapshot) => {
        const unsubscribeChats = onSnapshot(q, async (snapshot) => {
          const existingChat = snapshot.docs.find(d => 
            d.data().participants.includes(recipient.id)
          );

          if (existingChat) {
            const chatId = existingChat.id;
            setChatId(chatId);

            // Real-time messages subscription
            const messagesQuery = query(
              collection(db, 'chats', chatId, 'messages'),
              orderBy('timestamp', 'asc')
            );

            unsubscribeMessages = onSnapshot(messagesQuery, (snap) => {
              const firebaseMessages = snap.docChanges()
                .filter(change => change.type === 'added')
                .map(change => ({
                  id: change.doc.id,
                  ...change.doc.data(),
                  timestamp: change.doc.data().timestamp?.toDate()
                }));

              // Merge with local messages, filtering out duplicates
              setMessages(prev => [
                ...prev.filter(msg => !msg.id?.startsWith('temp_')),
                ...firebaseMessages
              ].reduce((acc, curr) => 
                acc.some(msg => msg.id === curr.id) ? acc : [...acc, curr], 
                []
              ));
            });
          } 
          else {
            // Create new chat if doesn't exist
            const newChat = await addDoc(chatsRef, {
              participants: [currentUser.uid, recipient.id],
              createdAt: new Date()
            });
            setChatId(newChat.id);
          }
        });
      });
        return () => {
          unsubscribeChats();
          unsubscribeMessages();
        };
      } catch (error) {
        setError('Failed to initialize chat');
        console.error("Chat error:", error);
      }
    };

    const cleanup = initializeChat();
    
    return () => {
      cleanup?.();
    };
  }, [currentUser, recipient]);
  // Updated voice message handler
  const handleVoiceMessage = async (audioBlob) => {
    const tempMessageId = `temp_${Date.now()}`;
    
    try {
      // Add temporary local message
      setMessages(prev => [...prev, {
        id: tempMessageId,
        audioUrl: null,
        sender: currentUser.uid,
        timestamp: new Date(),
        status: 'sending',
        replyTo: replyingTo?.id ?? null
      }]);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!res.ok) throw new Error('Upload failed');
      const { secure_url } = await res.json();
      if (!secure_url) throw new Error('No audio URL received');

      // Add to Firestore (without status field)
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        audioUrl: secure_url,
        sender: currentUser.uid,
        timestamp: new Date(),
        replyTo: replyingTo?.id ?? null
      });

      // Remove temporary message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setReplyingTo(null);
    } catch (error) {
      setError(error.message);
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? { ...msg, status: 'failed' } : msg
      ));
    }
  };
  // Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.start();

      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

      const audioChunks = [];
      mediaRecorder.current.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        await handleVoiceMessage(audioBlob);
      };
    } catch (error) {
      setError('Microphone access required');
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
    clearInterval(timerRef.current);
    setRecording(false);
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    }
  };

  if (error) return (
    <div className="flex-1 bg-[#1a120b] flex items-center justify-center">
      <div className="text-red-500 text-lg">{error}</div>
    </div>
  );

  if (!recipient) return (
    <div className="flex-1 bg-[#1a120b] flex items-center justify-center">
      <div className="animate-pulse text-[#e5d5c6]">Loading conversation...</div>
    </div>
  );

  return (
    <div className="flex-1 bg-[#1a120b] flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-[#3d2e20] flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-[#e5d5c6] hover:text-[#6CFFCA]">
          <ArrowLeftIcon className="w-8 h-8" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <UserCircleIcon className="w-12 h-12 text-[#e5d5c6]" />
          <div>
            <h2 className="text-[#e5d5c6] font-semibold">{recipient.displayName}</h2>
            <p className="text-xs text-[#e5d5c6] opacity-75">
              {recipient.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble 
            key={msg.id}
            message={msg}
            isSender={msg.sender === currentUser.uid}
            onDelete={deleteMessage}
            onReply={setReplyingTo}
            replyingTo={messages.find(m => m.id === msg.replyTo)}
          />
        ))}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#2b2118] border-t border-[#3d2e20]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#e5d5c6] opacity-75">
              Replying to {replyingTo.sender === currentUser.uid ? 'yourself' : recipient.displayName}
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-[#e5d5c6] hover:text-[#6CFFCA]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="p-4 border-t border-[#3d2e20] flex items-center justify-center">
        <div className="relative group">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-6 rounded-full transition-all ${recording ? 'bg-red-500/20 animate-pulse' : 'bg-[#3d2e20] hover:bg-[#4f3e2e]'}`}
          >
            <MicrophoneIcon className={`h-8 w-8 ${recording ? 'text-red-500' : 'text-[#e5d5c6]'}`} />
          </button>
          {recording && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-red-500 text-sm">
              {recordingTime}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isSender, onDelete, onReply, replyingTo }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const resetOnEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', resetOnEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', resetOnEnd);
    };
  }, []);
  const displayStatus = message.status ?? (isSender ? 'sent' : null);

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
      <div className={`p-4 rounded-2xl max-w-[75%] relative ${isSender ? 'bg-[#3d2e20]' : 'bg-[#2b2118]'}`}>
      {message.audioUrl && <audio ref={audioRef} src={message.audioUrl} />}

        {replyingTo && (
          <div className="mb-2 p-2 bg-[#1a120b] rounded-lg border-l-4 border-[#6CFFCA]">
            <p className="text-xs text-[#e5d5c6] opacity-75 truncate">
              {replyingTo.sender === message.sender ? 'You' : 'They'}: {replyingTo.text || 'Voice message'}
            </p>
          </div>
        )}

        <audio ref={audioRef} src={message.audioUrl} />

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-32 h-6 rounded-lg overflow-hidden bg-[#ffffff20]">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #e5d5c6 20%, #3d2e20 50%, #e5d5c6 80%)',
                  backgroundSize: '200% 100%',
                  animation: playing ? 'wave 2s linear infinite' : 'none'
                }}
              />
            </div>
          </div>
          <button 
            onClick={togglePlayback}
            className="text-[#e5d5c6] hover:text-[#6CFFCA] transition-colors"
          >
            {playing ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>
          <div className="flex-1">
            <div className="relative h-1 bg-[#ffffff20] rounded-full">
              <div 
                className="absolute h-full bg-[#6CFFCA] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#e5d5c6] opacity-75">
            {Math.floor(duration)}s •{' '}
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {displayStatus && (
            <span className={`text-xs ${
              displayStatus === 'sent' ? 'text-[#6CFFCA]' : 
              displayStatus === 'failed' ? 'text-red-500' : 'text-[#e5d5c6]'
            }`}>
              {displayStatus}
            </span>
          )}
        </div>
          </div>
        </div>

        <div className="absolute top-2 right-2 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
          {isSender && (
            <button 
              onClick={() => onDelete(message.id)}
              className="text-red-500 hover:text-red-400"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => onReply(message)}
            className="text-[#e5d5c6] hover:text-[#6CFFCA]"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}