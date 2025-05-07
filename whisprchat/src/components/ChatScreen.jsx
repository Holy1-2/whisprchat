import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, query, where, orderBy, 
  onSnapshot, addDoc, doc, getDoc, getDocs, deleteDoc, updateDoc,
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  MicrophoneIcon, PlayIcon, PauseIcon, TrashIcon,
  UserCircleIcon, ArrowLeftIcon, MinusIcon,ArrowUturnLeftIcon,CheckIcon,         
  CheckBadgeIcon  
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
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Typing indicator handler
  const handleTyping = async (isUserTyping) => {
    if (!chatId) return;
    
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`typing.${currentUser.uid}`]: isUserTyping
    });
  };

  // Listen for typing status
  useEffect(() => {

    if (!chatId || !recipient) return;
    
    const chatRef = doc(db, 'chats', chatId);
    
    const unsubscribe = onSnapshot(chatRef, (doc) => {
    
    const data = doc.data();
    
    setRecipientTyping(data?.typing?.[recipient.id] || false);
    
    });
    
    return () => unsubscribe();
    
    }, [chatId, recipient?.id])

  // Enhanced message status indicators
  const updateMessageStatus = async (messageId, status) => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, { status });
  };

  // Swipe to reply handlers
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Update touch handlers in ChatScreen
const handleTouchStart = (e) => {
  setTouchStart({
    x: e.targetTouches[0].clientX,
    y: e.targetTouches[0].clientY
  });
};

const handleTouchMove = (e) => {
  setTouchEnd({
    x: e.targetTouches[0].clientX,
    y: e.targetTouches[0].clientY
  });
};

const handleTouchEnd = (message) => {
  const deltaX = touchStart.x - touchEnd.x;
  const deltaY = Math.abs(touchEnd.y - touchStart.y);
  
  if (deltaX > 50 && deltaY < 30) {
    setReplyingTo(message);
  }
  setTouchStart({ x: 0, y: 0 });
  setTouchEnd({ x: 0, y: 0 });
};
  // Recording status indicator
  // In ChatScreen component
useEffect(() => {
  const updateRecordingStatus = async (isRecording) => {
    if (!chatId) return;
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`recording.${currentUser.uid}`]: isRecording
    });
  };

  if (recording) updateRecordingStatus(true);
  return () => updateRecordingStatus(false);
}, [recording]);
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
// Add to fetchRecipient effect
useEffect(() => {
  if (!recipient?.id) return;
  
  const userRef = doc(db, 'users', recipient.id);
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      setRecipient(prev => ({ ...prev, ...doc.data() }));
    }
  });

  return unsubscribe;
}, [recipient?.id]);
  // Initialize chat session
  useEffect(() => {
    if (!currentUser || !recipient) return;

    let unsubscribeMessages = () => {};
    let unsubscribeChats = () => {};

    const chatsQuery = query(collection(db, 'chats'));

    unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const existingChatDoc = snapshot.docs.find((doc) => {
          const participants = doc.data().participants || [];
          return (
            participants.includes(currentUser.uid) &&
            participants.includes(recipient.id)
          );
        });

        if (existingChatDoc) {
          const chatId = existingChatDoc.id;
          setChatId(chatId);

          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'asc')
          );

          unsubscribeMessages = onSnapshot(messagesQuery, (messageSnap) => {
            const firebaseMessages = messageSnap.docChanges()
              .filter((change) => change.type === 'added')
              .map((change) => ({
                id: change.doc.id,
                ...change.doc.data(),
                timestamp: change.doc.data().timestamp?.toDate(),
              }));

            setMessages((prev) =>
              [
                ...prev.filter((msg) => !msg.id?.startsWith('temp_')),
                ...firebaseMessages,
              ].reduce((acc, curr) => {
                return acc.some((msg) => msg.id === curr.id) ? acc : [...acc, curr];
              }, [])
            );
          });
        } else {
          // Create a new chat
          const newChat = await addDoc(collection(db, 'chats'), {
            participants: [currentUser.uid, recipient.id],
            createdAt: new Date(),
          });
          setChatId(newChat.id);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setError('Failed to initialize chat');
      }
    });

    return () => {
      unsubscribeChats();
      unsubscribeMessages();
    };
  }, [currentUser, recipient, setChatId, setMessages, setError]);
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
      {/* Chat Header with Typing Indicator */}
      <div className="p-4 border-b border-[#3d2e20] flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-[#e5d5c6] hover:text-[#6CFFCA]">
          <ArrowLeftIcon className="w-8 h-8" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <UserCircleIcon className="w-12 h-12 text-[#e5d5c6]" />
          <div>
            <h2 className="text-[#e5d5c6] font-semibold">{recipient.displayName}</h2>
            <p className="text-xs text-[#e5d5c6] opacity-75">
              {recipientTyping ? 'typing...' : 
               recording ? 'recording...' :
               recipient.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages List with Swipeable Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            onTouchStart={(e) => handleTouchStart(e, msg)}
            onTouchMove={(e) => handleTouchMove(e, msg)}
            onTouchEnd={() => handleTouchEnd(msg)}
            className="relative"
          >
            <MessageBubble 
              message={msg}
              isSender={msg.sender === currentUser.uid}
              onDelete={deleteMessage}
              onReply={setReplyingTo}
              replyingTo={messages.find(m => m.id === msg.replyTo)}
              recipient={recipient}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#2b2118] border-t border-[#6CFFCA]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#6CFFCA]">
              Replying to {replyingTo.sender === currentUser.uid ? 
                'yourself' : recipient.displayName}
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-[#6CFFCA] hover:text-[#5ae0b5]"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-[#e5d5c6] opacity-75 truncate mt-1">
            {replyingTo.text || 'Voice message'}
          </p>
        </div>
      )}

      {/* Recording Controls with Visual Feedback */}
      <div className="p-4 border-t border-[#3d2e20]">
        <div className="flex items-center justify-center gap-4">
          {recording && (
            <div className="flex items-center gap-2 text-red-500 animate-pulse">
              <span className="h-3 w-3 bg-red-500 rounded-full" />
              <span>Recording - {recordingTime}s</span>
            </div>
          )}
          <div className="relative group">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-4 rounded-full transition-all ${
                recording ? 'bg-red-500/30' : 'bg-[#3d2e20] hover:bg-[#4f3e2e]'
              }`}
            >
              <MicrophoneIcon className={`h-8 w-8 ${recording ? 'text-red-500' : 'text-[#e5d5c6]'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isSender, onDelete, onReply, replyingTo, recipient }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const audioRef = useRef(null);
  const { currentUser } = useAuth();

  const togglePlayback = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnd = () => setPlaying(false);
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('timeupdate', updateProgress);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('timeupdate', updateProgress);
      audio.pause();
    };
  }, [message.id]);

  const handleReaction = async (emoji) => {
    try {
      if (!message.chatId || !message.id) return;
      
      const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
      const currentReactions = message.reactions || {};

      if (currentReactions[emoji]?.includes(currentUser.uid)) {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayUnion(currentUser.uid)
        });
      }
    } catch (error) {
      console.error("Reaction error:", error);
    }
    setShowReactions(false);
  
  };
  const renderStatusIndicator = () => {
    if (!isSender) return null;
    return (
      <div className="relative">
        {message.status === 'read' && (
          <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-[#6CFFCA] opacity-75" />
        )}
        <CheckBadgeIcon className={`w-4 h-4 ${
          message.status === 'read' ? 'text-[#6CFFCA]' : 'text-[#e5d5c6]'
        }`} />
      </div>
    );
  };

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} px-2 md:px-4`}>
      <div className={`p-3 md:p-4 rounded-2xl max-w-[90%] md:max-w-[75%] relative ${
        isSender ? 'bg-[#3d2e20]' : 'bg-[#2b2118]'
      }`}>
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-[#1a120b] rounded-lg border-l-4 border-[#6CFFCA]">
            <p className="text-xs text-[#6CFFCA] font-medium truncate">
              {replyingTo.sender === currentUser.uid ? 'You' : recipient.displayName}
            </p>
            <p className="text-xs text-[#e5d5c6] opacity-75 truncate">
              {replyingTo.text || 'Voice message'}
            </p>
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div className="absolute bottom-full left-0 flex gap-1 bg-[#3d2e20] p-1 rounded-full shadow-lg z-10">
            {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Message Content */}
        <div onClick={() => setShowReactions(!showReactions)}>
          <audio ref={audioRef} src={message.audioUrl} preload="metadata" />

          <div className="flex items-center gap-2 md:gap-4">
            {/* Responsive progress visualization */}
            <div className="flex-1 min-w-[100px]">
              <div className="w-full h-4 md:h-6 rounded-lg overflow-hidden bg-[#ffffff20]">
                <div
                  className="h-full rounded-lg animate-wave"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #e5d5c6 20%, #3d2e20 50%, #e5d5c6 80%)',
                    backgroundSize: '200% 100%',
                    animation: playing ? 'wave 2s linear infinite' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Play/Pause Control */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (audioRef.current) {
                  playing ? audioRef.current.pause() : audioRef.current.play();
                }
              }}
              className="text-[#e5d5c6] hover:text-[#6CFFCA] transition-colors"
            >
              {playing ? (
                <PauseIcon className="h-5 w-5 md:h-6 md:w-6" />
              ) : (
                <PlayIcon className="h-5 w-5 md:h-6 md:w-6" />
              )}
            </button>

            {/* Timeline */}
            <div className="flex-1 min-w-[80px]">
              <div className="relative h-1 bg-[#ffffff20] rounded-full">
                <div 
                  className="absolute h-full bg-[#6CFFCA] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 md:mt-2">
                <span className="text-xs text-[#e5d5c6] opacity-75">
                  {Math.floor(duration || 0)}s •{' '}
                  {message.timestamp?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {renderStatusIndicator()}
              </div>
            </div>
          </div>

          {/* Responsive reactions */}
          <div className="flex flex-wrap gap-1 md:gap-2 mt-1 md:mt-2">
            {Object.entries(message.reactions || {}).map(([emoji, users]) => (
              <div 
                key={emoji}
                className="flex items-center px-2 py-0.5 bg-[#1a120b] rounded-full border border-[#3d2e20]"
              >
                <span className="text-sm">{emoji}</span>
                <span className="text-xs ml-1 text-[#e5d5c6]">
                  {users?.length || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsive message actions */}
        <div className="absolute -right-1 -top-1 md:-right-2 md:-top-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
          {isSender && (
            <button 
              onClick={() => onDelete(message.id)}
              className="p-1 bg-red-500 rounded-full hover:bg-red-600"
            >
              <TrashIcon className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </button>
          )}
          <button 
            onClick={() => onReply(message)}
            className="p-1 bg-[#6CFFCA] rounded-full hover:bg-[#5ae0b5]"
          >
            <ArrowUturnLeftIcon className="w-3 h-3 md:w-4 md:h-4 text-[#1a120b]" />
          </button>
        </div>
      </div>
    </div>
  );
}