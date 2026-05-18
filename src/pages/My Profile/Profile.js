import React, { useEffect, useState } from 'react';
import { BsCamera, BsCheck, BsMailbox, BsSave } from 'react-icons/bs';
import { FaUser } from 'react-icons/fa';
import { FiEdit3, FiFileText } from 'react-icons/fi';
import { PiX } from 'react-icons/pi';
import { useDispatch } from 'react-redux';
import { getProfile, updateProfile } from '../../Redux/userSlice';
import { toast } from 'sonner';
import { uploadFile } from '../../_helpers/globalFunctions';
import Loader from '../../components/Loader/Loader';

const profileToForm = (user = {}) => {
    const profile = user.profile || {};
    const fullName = user.full_name || [profile.firstName, profile.lastName].filter(Boolean).join(" ");

    return {
        ...user,
        userName: user.userName || user.email?.split("@")?.[0] || "",
        email: user.email || "",
        full_name: fullName || "",
        user_image: user.user_image || profile.avatarUrl || null,
    };
};

const Profile = () => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        userName: '',
        email: '',
        full_name: '',
        user_image: null
    });

    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await dispatch(getProfile()).unwrap();
                if (res) {
                    setFormData(profileToForm(res?.data));
                }
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPG/PNG files are allowed');
            return;
        }

        const maxSize = 2 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('File size should not exceed 5MB');
            return;
        }

        try {
            setLoading(true);
            const uploadedImage = await uploadFile(file, "PROFILES");
            const res = await dispatch(updateProfile({
                user_image: uploadedImage,
                full_name: formData?.full_name,
            })).unwrap();
            const nextProfile = res?.data ? profileToForm(res.data) : {
                ...formData,
                user_image: uploadedImage,
            };
            setFormData(prev => ({
                ...prev,
                ...nextProfile,
            }));
            window.dispatchEvent(new CustomEvent('profile:updated', { detail: res?.data || nextProfile }));
            toast.success('Profile picture updated successfully!');
        } catch (error) {
            console.error('File upload failed:', error);
            toast.error('File upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            let apiPayload = {
                user_image: formData?.user_image,
                full_name: formData?.full_name
            }
            const res = await dispatch(updateProfile(apiPayload)).unwrap();
            if (res?.data) {
                setFormData(profileToForm(res.data));
                window.dispatchEvent(new CustomEvent('profile:updated', { detail: res.data }));
            }
            setShowSuccess(true);
            setIsEditing(false);
            toast.success("Profile Update Successfully")

        } catch (error) {
            console.log(error)
            toast.error(error?.message || 'Error updating profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
    };


    return (
        <div className="min-h-screen bg-white py-8 px-4">
            <Loader loading={loading} />
            <div className="max-w-4xl mx-auto">
                {showSuccess && (
                    <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-right">
                        <BsCheck className="w-5 h-5" />
                        <span>Profile updated successfully!</span>
                    </div>
                )}

                <div className="bg-white shadow-xl overflow-hidden transform transition-all duration-500 hover:shadow-2xl">
                 
                    <div className="h-32 bg-gradient-to-r from-[#0A73CF] via-[#0A73CF] to-[#0A73CF] relative overflow-hidden">
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        <div className="absolute top-0 left-0 w-full h-full">
                            <div className="absolute top-4 left-4 w-8 h-8 bg-white/10 rounded-full animate-float"></div>
                            <div className="absolute top-8 right-12 w-4 h-4 bg-white/20 rounded-full animate-float-delay"></div>
                            <div className="absolute bottom-4 right-4 w-6 h-6 bg-white/15 rounded-full animate-float"></div>
                        </div>
                    </div>

                    <div className="relative -mt-16 flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 transform transition-all duration-300 group-hover:scale-105">
                                {formData?.user_image ? (
                                    <img
                                        src={formData?.user_image}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                        <FaUser className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            <label
                                className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                                title="Change profile picture"
                            >
                                <BsCamera className="w-8 h-8 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={loading}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="px-8 py-6">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">
                                {formData.full_name || 'Your Profile'}
                            </h1>
                            <p className="text-gray-600">Manage your account information</p>
                        </div>

                        <div className="flex justify-center mb-8">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-gradient-to-r from-[#0A73CF] via-[#0A73CF] to-[#0A73CF] text-white px-8 py-3 r font-semibold flex items-center space-x-2 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                                >
                                    <FiEdit3 className="w-5 h-5" />
                                    <span>Edit Profile</span>
                                </button>
                            ) : (
                                <div className="flex space-x-4">
                                    <button
                                        onClick={handleUpdate}
                                        disabled={updating}
                                        className="bg-gradient-to-r from-[#0A73CF] via-[#0A73CF] to-[#0A73CF]  text-white px-8 py-3 font-semibold flex items-center space-x-2 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {updating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <BsSave className="w-5 h-5" />
                                                <span>Save Changes</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="bg-gray-500 text-white px-8 py-3  font-semibold flex items-center space-x-2 hover:bg-gray-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                                    >
                                        <PiX className="w-5 h-5" />
                                        <span>Cancel</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                    <FaUser className="w-4 h-4 text-blue-500" />
                                    <span>Username</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="userName"
                                        value={formData.userName || ''}
                                        onChange={handleChange}
                                        disabled={true}
                                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${isEditing
                                            ? 'border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white'
                                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                            } outline-none`}
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                    <BsMailbox className="w-4 h-4 text-purple-500" />
                                    <span>Email Address</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={true}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-not-allowed outline-none"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            {/* Full Name Field */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                    <FiFileText className="w-4 h-4 text-green-500" />
                                    <span>Full Name</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${isEditing
                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-white'
                                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                            } outline-none`}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upload Instructions */}
                        {isEditing && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <div className="flex items-start space-x-3">
                                    <BsCamera className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-800">Profile Picture</h4>
                                        <p className="text-sm text-blue-600 mt-1">
                                            Click on your profile picture to upload a new image.
                                            Supported formats: JPG, PNG (max 5\2MB)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes float-delay {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                
                .animate-float-delay {
                    animation: float-delay 3s ease-in-out infinite;
                    animation-delay: 0.5s;
                }
                
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Profile;
