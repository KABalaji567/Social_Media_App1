import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Image, X, Upload, Hash, FolderOpen, Type } from 'lucide-react';

const CreatePost = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [caption, setCaption] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size too large. Max size is 5MB.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.warn('Please select an image to upload');
      return;
    }

    setLoading(true);
    
    // Parse tags (split by spaces or commas, clean leading # and whitespace)
    const tagsArray = tagsInput
      .split(/[\s,]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter((tag) => tag.length > 0);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption.trim());
    if (categoryName.trim()) {
      formData.append('category_name', categoryName.trim());
    }
    tagsArray.forEach((tag) => {
      formData.append('tag_names', tag);
    });

    try {
      await api.post('/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Post created successfully!');
      navigate('/');
    } catch (err) {
      console.error('Failed to create post', err);
      toast.error(err.response?.data?.detail || 'Failed to create post. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-container">
      <div className="create-post-card glass-panel animate-fade-in">
        <div className="create-header">
          <h3>Create New Post</h3>
          <p>Share a photo and describe your moment</p>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Image Upload Area */}
          <div className="upload-section">
            {!imagePreview ? (
              <label className="upload-dropzone">
                <Upload className="upload-icon" />
                <span className="upload-text-main">Choose an image file</span>
                <span className="upload-text-sub">JPEG, PNG, WEBP up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  required
                />
              </label>
            ) : (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="upload-preview-image" />
                <button type="button" className="remove-preview-btn" onClick={handleRemoveImage}>
                  <X className="remove-icon" />
                </button>
              </div>
            )}
          </div>

          {/* Post details fields */}
          <div className="fields-section">
            <div className="form-group">
              <label htmlFor="caption">
                <Type className="field-icon" />
                Caption
              </label>
              <textarea
                id="caption"
                className="glass-input textarea-caption"
                placeholder="Write an interesting caption..."
                rows="4"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">
                  <FolderOpen className="field-icon" />
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  className="glass-input"
                  placeholder="e.g. Nature, Travel, Coding"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags">
                  <Hash className="field-icon" />
                  Hashtags
                </label>
                <input
                  type="text"
                  id="tags"
                  className="glass-input"
                  placeholder="e.g. summer, vibes (space/comma separated)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary create-submit-btn" disabled={loading}>
              {loading ? 'Publishing...' : 'Share Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
