/**
 * Church/Organization Registration Page
 * File: OpenWordClient/pages/register.js
 * 
 * This page allows new churches/organizations to register for the OpenWord service.
 * It collects all necessary information and creates both a user account and church profile.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Head from 'next/head';
import styles from '../styles/Register.module.css';

// Available languages for translation
const AVAILABLE_LANGUAGES = [
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Mandarin Chinese', value: 'zh' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Russian', value: 'ru' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Polish', value: 'pl' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Swedish', value: 'sv' },
  { label: 'Norwegian', value: 'no' },
  { label: 'Danish', value: 'da' },
  { label: 'Finnish', value: 'fi' },
  { label: 'Greek', value: 'el' },
  { label: 'Turkish', value: 'tr' },
  { label: 'Vietnamese', value: 'vi' },
  { label: 'Thai', value: 'th' },
  { label: 'Indonesian', value: 'id' },
  { label: 'Tagalog', value: 'tl' },
  { label: 'Swahili', value: 'sw' },
  { label: 'Romanian', value: 'ro' },
  { label: 'Czech', value: 'cs' },
  { label: 'Hungarian', value: 'hu' },
  { label: 'Hebrew', value: 'he' },
  { label: 'Ukrainian', value: 'uk' },
];

// Host language options
const HOST_LANGUAGES = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish', value: 'es-ES' },
  { label: 'French', value: 'fr-FR' },
  { label: 'German', value: 'de-DE' },
  { label: 'Portuguese', value: 'pt-PT' },
  { label: 'Portuguese (Brazil)', value: 'pt-BR' },
];

export default function Register() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    // User Account
    email: '',
    password: '',
    confirmPassword: '',

    // Church Information
    churchName: '',
    churchKey: '',
    greeting: 'Welcome!',
    welcomeMessages: ['Join us for live translation'],
    additionalWelcome: '',
    waitingMessage: 'Translation service is currently offline',
    
    // Contact Information
    contactEmail: '',
    phone: '',
    address: '',
    website: '',

    // Configuration
    hostLanguage: 'en-US',
    translationLanguages: [],
    defaultServiceId: '1234',

    // Logo
    logoFile: null,
    logoPreview: null,
    logoBase64: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form
  const [welcomeMessageInput, setWelcomeMessageInput] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/control');
    }
  }, [user, loading, router]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle language selection
  const handleLanguageToggle = (langValue) => {
    setFormData(prev => ({
      ...prev,
      translationLanguages: prev.translationLanguages.includes(langValue)
        ? prev.translationLanguages.filter(l => l !== langValue)
        : [...prev.translationLanguages, langValue]
    }));
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please select an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, logo: 'Image must be less than 5MB' }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        logoFile: file,
        logoPreview: reader.result,
        logoBase64: reader.result
      }));
      setErrors(prev => ({ ...prev, logo: '' }));
    };
    reader.readAsDataURL(file);
  };

  // Add welcome message
  const handleAddWelcomeMessage = () => {
    if (welcomeMessageInput.trim()) {
      setFormData(prev => ({
        ...prev,
        welcomeMessages: [...prev.welcomeMessages, welcomeMessageInput.trim()]
      }));
      setWelcomeMessageInput('');
    }
  };

  // Remove welcome message
  const handleRemoveWelcomeMessage = (index) => {
    setFormData(prev => ({
      ...prev,
      welcomeMessages: prev.welcomeMessages.filter((_, i) => i !== index)
    }));
  };

  // Generate church key suggestion
  const generateChurchKey = () => {
    const name = formData.churchName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
    setFormData(prev => ({ ...prev, churchKey: name }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Step 1 validation
    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }

      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (!formData.churchName) newErrors.churchName = 'Church name is required';
      if (!formData.churchKey) newErrors.churchKey = 'Church key is required';
      else if (!/^[A-Z0-9_-]+$/.test(formData.churchKey)) {
        newErrors.churchKey = 'Church key must be uppercase letters, numbers, underscores, or hyphens';
      }
    }

    // Step 2 validation
    if (step === 2) {
      if (formData.translationLanguages.length === 0) {
        newErrors.translationLanguages = 'Please select at least one translation language';
      }
    }

    // Step 3 validation (optional fields, mostly)
    if (step === 3) {
      if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateForm()) {
      setStep(step + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data
      const registrationData = {
        // User account
        email: formData.email,
        password: formData.password,

        // Church information
        church: {
          name: formData.churchName,
          church_key: formData.churchKey,
          greeting: formData.greeting,
          message: formData.welcomeMessages,
          additional_welcome: formData.additionalWelcome,
          waiting_message: formData.waitingMessage,
          logo_base64: formData.logoBase64,
          host_language: formData.hostLanguage,
          translation_languages: formData.translationLanguages.map(value => {
            const lang = AVAILABLE_LANGUAGES.find(l => l.value === value);
            return { label: lang.label, value: lang.value };
          }),
          default_service_id: formData.defaultServiceId,
          email: formData.contactEmail,
          phone: formData.phone,
          address: formData.address,
          website: formData.website,
        }
      };

      // Send registration request
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_NAME}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Show success message
        alert('Registration successful! Please check your email to verify your account.');
        router.push('/login');
      } else {
        setErrors({ submit: result.message || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'An error occurred during registration. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Register Your Organization - OpenWord</title>
        <meta name="description" content="Register your church or organization for OpenWord live translation service" />
      </Head>

      <div className={styles.container}>
        <div className={styles.formContainer}>
          <div className={styles.header}>
            <h1>Register for OpenWord</h1>
            <p>Setup your organization for live translation services</p>
          </div>

          {/* Progress indicator */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
              <span>1</span>
              <p>Account</p>
            </div>
            <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
              <span>2</span>
              <p>Configuration</p>
            </div>
            <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
              <span>3</span>
              <p>Details</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Step 1: Account & Basic Info */}
            {step === 1 && (
              <div className={styles.formStep}>
                <h2>Account Information</h2>
                
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                  {errors.email && <span className={styles.error}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    required
                  />
                  {errors.password && <span className={styles.error}>{errors.password}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    required
                  />
                  {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
                </div>

                <hr className={styles.divider} />

                <h2>Organization Information</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="churchName">Organization Name *</label>
                  <input
                    type="text"
                    id="churchName"
                    name="churchName"
                    value={formData.churchName}
                    onChange={handleChange}
                    placeholder="Central Community Church"
                    required
                  />
                  {errors.churchName && <span className={styles.error}>{errors.churchName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="churchKey">
                    Organization Key *
                    <button 
                      type="button" 
                      onClick={generateChurchKey}
                      className={styles.generateButton}
                    >
                      Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    id="churchKey"
                    name="churchKey"
                    value={formData.churchKey}
                    onChange={handleChange}
                    placeholder="CENTRAL_CHURCH"
                    required
                  />
                  <small>Uppercase letters, numbers, underscores, or hyphens only. Keep this confidential!</small>
                  {errors.churchKey && <span className={styles.error}>{errors.churchKey}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="defaultServiceId">Default Service ID *</label>
                  <input
                    type="text"
                    id="defaultServiceId"
                    name="defaultServiceId"
                    value={formData.defaultServiceId}
                    onChange={handleChange}
                    placeholder="1234"
                    required
                  />
                  <small>Used in QR codes and URLs for participants to join</small>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && (
              <div className={styles.formStep}>
                <h2>Translation Configuration</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="hostLanguage">Primary Service Language *</label>
                  <select
                    id="hostLanguage"
                    name="hostLanguage"
                    value={formData.hostLanguage}
                    onChange={handleChange}
                    required
                  >
                    {HOST_LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  <small>The main language spoken during your services</small>
                </div>

                <div className={styles.formGroup}>
                  <label>Translation Languages *</label>
                  <div className={styles.languageGrid}>
                    {AVAILABLE_LANGUAGES.map(lang => (
                      <label key={lang.value} className={styles.languageCheckbox}>
                        <input
                          type="checkbox"
                          checked={formData.translationLanguages.includes(lang.value)}
                          onChange={() => handleLanguageToggle(lang.value)}
                        />
                        <span>{lang.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.translationLanguages && (
                    <span className={styles.error}>{errors.translationLanguages}</span>
                  )}
                  <small>Select all languages you want to offer translation for</small>
                </div>

                <hr className={styles.divider} />

                <h2>Welcome Messages</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="greeting">Greeting Text</label>
                  <input
                    type="text"
                    id="greeting"
                    name="greeting"
                    value={formData.greeting}
                    onChange={handleChange}
                    placeholder="Welcome to our service!"
                  />
                  <small>Shown at the top of the participant app</small>
                </div>

                <div className={styles.formGroup}>
                  <label>Welcome Messages</label>
                  <div className={styles.messageList}>
                    {formData.welcomeMessages.map((msg, index) => (
                      <div key={index} className={styles.messageItem}>
                        <span>{msg}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWelcomeMessage(index)}
                          className={styles.removeButton}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.messageInput}>
                    <input
                      type="text"
                      value={welcomeMessageInput}
                      onChange={(e) => setWelcomeMessageInput(e.target.value)}
                      placeholder="Add a welcome message"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWelcomeMessage())}
                    />
                    <button
                      type="button"
                      onClick={handleAddWelcomeMessage}
                      className={styles.addButton}
                    >
                      Add
                    </button>
                  </div>
                  <small>Each message appears as a separate paragraph</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="additionalWelcome">Additional Welcome Text</label>
                  <textarea
                    id="additionalWelcome"
                    name="additionalWelcome"
                    value={formData.additionalWelcome}
                    onChange={handleChange}
                    placeholder="Any additional welcome information..."
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="waitingMessage">Offline Message</label>
                  <input
                    type="text"
                    id="waitingMessage"
                    name="waitingMessage"
                    value={formData.waitingMessage}
                    onChange={handleChange}
                    placeholder="Service is currently offline"
                  />
                  <small>Shown when translation service is not active</small>
                </div>
              </div>
            )}

            {/* Step 3: Details & Logo */}
            {step === 3 && (
              <div className={styles.formStep}>
                <h2>Contact Information (Optional)</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="contactEmail">Contact Email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="contact@church.org"
                  />
                  {errors.contactEmail && <span className={styles.error}>{errors.contactEmail}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, City, State 12345"
                    rows="2"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="website">Website</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.yourchurch.org"
                  />
                </div>

                <hr className={styles.divider} />

                <h2>Organization Logo</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="logo">Upload Logo (Optional)</label>
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className={styles.fileInput}
                  />
                  {errors.logo && <span className={styles.error}>{errors.logo}</span>}
                  <small>Maximum size: 5MB. Recommended: 200x200px square image</small>
                  
                  {formData.logoPreview && (
                    <div className={styles.logoPreview}>
                      <img src={formData.logoPreview} alt="Logo preview" />
                      <p>Logo preview</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {errors.submit && (
              <div className={styles.errorBox}>
                {errors.submit}
              </div>
            )}

            {/* Navigation buttons */}
            <div className={styles.buttonGroup}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className={styles.secondaryButton}
                >
                  Previous
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.primaryButton}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>

          <div className={styles.footer}>
            <p>
              Already have an account?{' '}
              <a href="/login">Sign in here</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
