import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  collection, query, where, onSnapshot, 
  doc, getDoc, orderBy, limit 
} from 'firebase/firestore';
import { MicrophoneIcon, PlayIcon } from '@heroicons/react/24/solid';
import defaultAvatar from '/user.png';

const VoiceNotesList = () => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        try {
          if (!currentUser) return; // Additional safeguard

          const chatsData = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const chatData = docSnapshot.data();
              const otherUserId = chatData.participants.find(
                id => id !== currentUser.uid
              );
              
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              const recipient = userDoc.exists() ? userDoc.data() : {
                displayName: 'Unknown User',
                photoURL: defaultAvatar
              };

              const messagesRef = collection(db, 'chats', docSnapshot.id, 'messages');
              const lastMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
              const lastMessageSnap = await getDocs(lastMessageQuery);
              const lastMessage = lastMessageSnap.docs[0]?.data() || null;

              return {
                id: docSnapshot.id,
                recipient: {
                  id: otherUserId,
                  name: recipient.displayName,
                  avatar: recipient.photoURL || defaultAvatar
                },
                lastMessage,
                unreadCount: chatData.unread?.[currentUser.uid] || 0,
                lastUpdated: chatData.lastUpdated?.toDate()
              };
            })
          );
          setChats(chatsData);
          setError('');
        } catch (err) {
          setError('Failed to load conversations');
          console.error("Chat load error:", err);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError('Real-time updates error');
        console.error("Snapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, navigate]); // Added navigate to dependencies

  const handleChatClick = (recipientId) => {
    if (!currentUser) return;
    navigate(`/chat/${recipientId}`);
  };

  // Early return if no current user
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a120b]">
        <div className="animate-pulse text-[#e5d5c6]">Redirecting to login...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a120b]">
        <div className="animate-pulse text-[#e5d5c6]">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[#1a120b]">
        <div className="relative mb-8">
          <div className="w-48 h-48 bg-[#3d2e20] rounded-full opacity-40" />
          <MicrophoneIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-red-500" />
        </div>
        <h2 className="text-2xl text-[#e5d5c6] mb-4">Connection Error</h2>
        <p className="text-[#e5d5c6] opacity-75 mb-8 text-center px-4">
          {error}. Please refresh or try again later
        </p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[#1a120b]">
        <div className="relative mb-8">
          <div className="w-48 h-48 bg-[#3d2e20] rounded-full opacity-40" />
          <MicrophoneIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-[#6CFFCA]" />
        </div>
        <h2 className="text-2xl text-[#e5d5c6] mb-4">No Conversations</h2>
        <p className="text-[#e5d5c6] opacity-75 mb-8 text-center px-4">
          Start a new chat by sending your first voice message
        </p>
        <button
          onClick={() => navigate('/new-chat')}
          className="bg-[#6CFFCA] text-[#1a120b] px-6 py-3 rounded-full hover:bg-[#5ae0b5] transition-colors font-medium"
        >
          Start New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1a120b] h-full overflow-y-auto">
      <div className="p-4 border-b border-[#3d2e20]">
        <h2 className="text-[#e5d5c6] text-xl font-semibold">Recent Conversations</h2>
      </div>
      
      <div className="p-2">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => handleChatClick(chat.recipient.id)}
            className="flex items-center p-3 hover:bg-[#2b2118] cursor-pointer transition-colors border-b border-[#3d2e20]"
          >
            <img
              src={chat.recipient.avatar}
              alt={chat.recipient.name}
              className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-[#3d2e20]"
              onError={(e) => {
                e.target.src = defaultAvatar;
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[#e5d5c6] font-medium truncate">
                  {chat.recipient.name}
                </h3>
                <span className="text-xs text-[#e5d5c6] opacity-75">
                  {chat.lastUpdated?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#e5d5c6] opacity-75 text-sm truncate">
                  {chat.lastMessage ? (
                    <>
                      {chat.lastMessage.audioUrl ? (
                        <PlayIcon className="w-4 h-4 flex-shrink-0 text-[#6CFFCA]" />
                      ) : null}
                      <span className="truncate">
                        {chat.lastMessage.text || 'Voice message'}
                      </span>
                    </>
                  ) : (
                    <span className="italic">Start a conversation</span>
                  )}
                </div>
                {chat.unreadCount > 0 && (
                  <span className="bg-[#6CFFCA] text-[#1a120b] rounded-full px-2 py-1 text-xs font-medium">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceNotesList;