import React, { useState } from 'react';
import Input from '../../components/Atoms/Input/Input';
import Button from '../../components/Atoms/buttons/button';
import { changePassword } from '../../Redux/userManagementSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import Loader from '../../components/Loader/Loader';
import FormInput from '../../components/Atoms/FormInput/FormInput';

const ChangePassword = () => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const dispatch = useDispatch();
    const selector = useSelector(state => state.user);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing if form was previously submitted
        if (isSubmitted && errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        // Current password validation
        if (!formData.currentPassword.trim()) {
            newErrors.currentPassword = 'Current password is required';
            isValid = false;
        } else if (formData.currentPassword.length < 6) {
            newErrors.currentPassword = 'Password must be at least 6 characters';
            isValid = false;
        }

        // New password validation
        if (!formData.newPassword.trim()) {
            newErrors.newPassword = 'New password is required';
            isValid = false;
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = 'Password must be at least 8 characters';
            isValid = false;
        } else if (!/[A-Z]/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one uppercase letter';
            isValid = false;
        } else if (!/[0-9]/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one number';
            isValid = false;
        } else if (formData.newPassword === formData.currentPassword) {
            newErrors.newPassword = 'New password must be different from current password';
            isValid = false;
        }

        // Confirm password validation
        if (!formData.confirmNewPassword.trim()) {
            newErrors.confirmNewPassword = 'Please confirm your new password';
            isValid = false;
        } else if (formData.newPassword !== formData.confirmNewPassword) {
            newErrors.confirmNewPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitted(true);
        
        if (!validateForm()) {
            return;
        }

        const reqData = {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmNewPassword
        };

        dispatch(changePassword(reqData))
            .unwrap()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.message || 'Password updated successfully');
                    // Reset form on success
                    setFormData({
                        currentPassword: '',
                        newPassword: '',
                        confirmNewPassword: ''
                    });
                    setIsSubmitted(false);
                }
            })
            .catch((error) => {
                // Handle specific error cases
                if (error.message === 'Current password is incorrect') {
                    setErrors(prev => ({ ...prev, currentPassword: error.message }));
                    toast.error(error.message);
                } else {
                    toast.error(error || 'Error updating password');
                }
            });
    };

    return (
        <>
            <Loader loading={selector?.loading} />
            <div className="w-full max-h-screen flex justify-center items-center pt-10 px-4">
                <div className="w-full max-w-4xl bg-white space-y-11">
                    <div className="border-b pb-4 mb-6 p-6">
                        <h3 className="text-xl font-semibold text-gray-800">Change Password</h3>
                    </div>
                    <div className=''>
                        <img
                            className="object-contain mx-auto w-24 h-24 rounded-full cursor-pointer"
                            src="/Img/userProfile.png"
                            alt="Profile"
                        />
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="grid md:grid-cols-2 grid-cols-1 gap-4 p-6">
                            <FormInput
                                label="Current Password"
                                name="currentPassword"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                error={isSubmitted ? errors.currentPassword : ''}
                                required
                            />
                            <FormInput
                                label="New Password"
                                name="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={handleChange}
                                error={isSubmitted ? errors.newPassword : ''}
                                required
                            />
                            <FormInput
                                label="Confirm New Password"
                                name="confirmNewPassword"
                                type="password"
                                value={formData.confirmNewPassword}
                                onChange={handleChange}
                                error={isSubmitted ? errors.confirmNewPassword : ''}
                                required
                            />
                        </div>

                        <div className="py-5 flex justify-end border-t p-6">
                            <Button 
                                type="submit" 
                                disabled={selector?.loading}
                            >
                                {selector?.loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default ChangePassword;