import React, { useState } from 'react';
import { useAuth } from './components/AuthContext';
import { db, storage } from './components/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import { ShareIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function ProfileSettings({ isEditable = true }) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      setPhotoURL(url);
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to update profile picture');
    }
    setLoading(false);
  };

  const handleNameUpdate = async e => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update profile');
    }
  };

  const copyProfileLink = () => {
    const profileLink = `${window.location.origin}/profile/${currentUser.uid}`;
    navigator.clipboard.writeText(profileLink);
    toast.success('Profile link copied to clipboard!');
  };

  return (
    <div className="p-6 bg-gradient-to-br from-[#1a120b] to-[#2b2118] min-h-screen">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#3d2e20',
          color: '#e5d5c6',
          border: '1px solid #4f3e2e'
        }
      }} />

      {/* Profile Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <label className={`relative cursor-pointer ${!isEditable && 'pointer-events-none'}`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={!isEditable}
            />
            <div className="relative group">
              <img
                src={photoURL}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#3d2e20] hover:border-[#4f3e2e] transition-all"
              />
              {isEditable && (
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PencilIcon className="w-6 h-6 text-[#e5d5c6]" />
                </div>
              )}
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e5d5c6]"></div>
              </div>
            )}
          </label>
          <div>
            {isEditing ? (
              <form onSubmit={handleNameUpdate} className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-[#2b2118] text-[#e5d5c6] p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f3e2e]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-2 bg-[#3d2e20] rounded-lg hover:bg-[#4f3e2e] transition-colors"
                >
                  <CheckIcon className="w-5 h-5 text-[#e5d5c6]" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-[#e5d5c6] font-manrope">{displayName}</h2>
                {isEditable && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-[#3d2e20] rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-5 h-5 text-[#e5d5c6]" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-[#e5d5c6] opacity-75">{currentUser?.email}</p>
          </div>
        </div>

        {isEditable && (
          <button
            onClick={copyProfileLink}
            className="flex items-center gap-2 bg-[#3d2e20] text-[#e5d5c6] px-4 py-2 rounded-lg hover:bg-[#4f3e2e] transition-colors"
          >
            <ShareIcon className="w-5 h-5" />
            Share Profile
          </button>
        )}
      </div>

      {/* Additional Profile Sections */}
      <div className="space-y-6">
        <div className="bg-[#2b2118] p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-[#e5d5c6] mb-4">Voice Preferences</h3>
          {/* Add voice-specific settings here */}
        </div>

        <div className="bg-[#2b2118] p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-[#e5d5c6] mb-4">Privacy Settings</h3>
          {/* Add privacy settings here */}
        </div>
      </div>
    </div>
  );
}