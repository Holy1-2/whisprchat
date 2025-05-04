import React, { useState, useCallback,useEffect } from 'react';
import { useAuth } from './components/AuthContext';
import { auth, db } from './components/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { WhisprLogo } from './WhisprLogo';
import { ArrowPathIcon, EnvelopeIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';

const CLOUDINARY_CLOUD_NAME = 'dnzwjg4xp';
const CLOUDINARY_UPLOAD_PRESET = 'whispr';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
// alongside your existing useState calls
const [previewSrc, setPreviewSrc] = useState(null);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (!isLogin && !displayName.trim()) {
      toast.error('Please enter a display name');
      return false;
    }
    return true;
  };
  useEffect(() => {
    return () => {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [previewSrc]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhotoFile(file);
      setPreviewSrc(URL.createObjectURL(file));
    }
  }, []);

  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: false,
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Successfully logged in!');
        navigate('/new-chat');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        let photoURL = '';

        if (photoFile) {
          const formData = new FormData();
          formData.append('file', photoFile);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

          const uploadToast = toast.loading('Uploading profile image...');
          const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
          const data = await res.json();
          
          if (!res.ok) {
            toast.error(data.error?.message || 'Image upload failed');
            throw new Error('Image upload failed');
          }
          
          photoURL = data.secure_url;
          toast.dismiss(uploadToast);
        }

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          displayName,
          email,
          photoURL,
          createdAt: new Date(),
          lastSeen: new Date(),
        });

        toast.success('Account created successfully!');
        navigate('/new-chat');
      }
    } catch (err) {
      toast.error(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a120b] flex items-center justify-center p-4">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#3d2e20',
          color: '#e5d5c6',
          border: '1px solid #4f3e2e'
        }
      }} />

      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#2b2118] p-8 rounded-xl shadow-lg">
      <div className="flex flex-col items-center mb-8">
          <WhisprLogo className="w-24 h-24 mb-4" />
          <h2 className="text-2xl text-[#e5d5c6]">
            {isLogin ? 'Welcome to Whispr' : 'Create your Account'}
          </h2>
          <p className="text-[#e5d5c6]/80 mt-2">
            {isLogin ? 'Sign in to continue' : 'Join the conversation'}
          </p>
        </div>
       

        {!isLogin && (
          <div className="mb-4">
            <label className="block text-[#e5d5c6] text-sm mb-2">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#3d2e20] text-[#e5d5c6] p-3 rounded-lg pl-12 focus:ring-2 focus:ring-[#e5d5c6]"
                required
                minLength={3}
              />
              <UserCircleIcon className="h-5 w-5 text-[#e5d5c6] absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[#e5d5c6] text-sm mb-2">Email</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#3d2e20] text-[#e5d5c6] p-3 rounded-lg pl-12 focus:ring-2 focus:ring-[#e5d5c6]"
              required
            />
            <EnvelopeIcon className="h-5 w-5 text-[#e5d5c6] absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-[#e5d5c6] text-sm mb-2">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#3d2e20] text-[#e5d5c6] p-3 rounded-lg pl-12 focus:ring-2 focus:ring-[#e5d5c6]"
              required
              minLength={6}
            />
            <LockClosedIcon className="h-5 w-5 text-[#e5d5c6] absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        {!isLogin && (
          <div className="mb-6">
            <label className="block text-[#e5d5c6] text-sm mb-2">Profile Image</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-[#e5d5c6] bg-[#3d2e20]/50' : 'border-[#3d2e20] hover:border-[#4f3e2e]'}`}
            >
              <input {...getInputProps()} />
              
              {photoFile ? (
                <div className="flex flex-col items-center">
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover mb-2"
                  onLoad={() => URL.revokeObjectURL(previewSrc)}
                />
                <p className="text-[#e5d5c6] text-sm">Click to change or drag new photo</p>
              </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UserCircleIcon className="h-10 w-10 text-[#e5d5c6] mb-2" />
                  <p className="text-[#e5d5c6]">
                    {isDragActive ? 'Drop photo here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-sm text-[#e5d5c6]/80 mt-1">(Recommended size: 200x200px)</p>
                </div>
              )}
            </div>
          </div>
        )}


        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3d2e20] text-[#e5d5c6] p-3 rounded-lg hover:bg-[#4f3e2e] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : isLogin ? (
            'Login'
          ) : (
            'Create Account'
          )}
        </button>

        <p className="text-center mt-6 text-[#e5d5c6]">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#e5d5c6] hover:text-[#c4b5a3] underline "
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
}