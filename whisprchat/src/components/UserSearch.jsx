import React, { useState } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ChatBubbleOvalLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import defaultAvatar from '/user.png';

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setError('Please enter an email to search');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const q = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('No users found');
        setSearchResults([]);
      } else {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName || 'Unknown User',
          email: doc.data().email,
          photoURL: doc.data().photoURL || defaultAvatar
        }));
        setSearchResults(results);
      }
    } catch (err) {
      setError('Error searching users');
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = (user) => {
    navigate(`/chat/${user.id}`, { state: { recipient: user } });
  };

  return (
    <div className="h-full bg-[#1a120b] flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-[#3d2e20]">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="w-6 h-6 text-[#e5d5c6] absolute left-3" />
            <input
              type="email"
              placeholder="Search by email"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setError('');
              }}
              className="w-full pl-12 pr-4 py-2 bg-[#2b2118] text-[#e5d5c6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6CFFCA]"
            />
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-[#e5d5c6]">Searching users...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <MicrophoneIcon className="w-24 h-24 text-[#6CFFCA] mb-4" />
          <h3 className="text-xl text-[#e5d5c6] mb-2">{error}</h3>
          <p className="text-[#e5d5c6] opacity-75 text-center">
            {error === 'No users found' 
              ? 'Try searching with a different email'
              : 'Please check your search term and try again'}
          </p>
        </div>
      )}

      {/* Search Results */}
      {!loading && searchResults.length > 0 && (
        <div className="flex-1 overflow-y-auto p-2">
          {searchResults.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 hover:bg-[#2b2118] cursor-pointer transition-colors border-b border-[#3d2e20]"
            >
              <div className="flex items-center gap-4 flex-1">
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#3d2e20]"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#e5d5c6] font-medium truncate">
                    {user.displayName}
                  </h3>
                  <p className="text-sm text-[#e5d5c6] opacity-75 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => startConversation(user)}
                className="p-2 text-[#e5d5c6] hover:text-[#6CFFCA] transition-colors"
              >
                <ChatBubbleOvalLeftIcon className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty Initial State */}
      {!loading && !error && searchResults.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <MicrophoneIcon className="w-24 h-24 text-[#6CFFCA] mb-4" />
          <h3 className="text-xl text-[#e5d5c6] mb-2">Find Users</h3>
          <p className="text-[#e5d5c6] opacity-75 text-center px-4">
            Search by email to start a new conversation
          </p>
        </div>
      )}
    </div>
  );
}