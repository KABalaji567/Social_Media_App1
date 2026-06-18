import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PostCard from '../components/PostCard';
import api from '../utils/api';
import { Search, Compass, Tag, Hash, Grid } from 'lucide-react';

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagParam = searchParams.get('tag');
  const categoryParam = searchParams.get('category');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilterDescription, setActiveFilterDescription] = useState('All Posts');

  const fetchExplorePosts = async () => {
    setLoading(true);
    try {
      let res;
      if (tagParam) {
        res = await api.get(`/posts/by_tag/?tag=${tagParam}`);
        setActiveFilterDescription(`Posts tagged with #${tagParam}`);
      } else if (categoryParam) {
        res = await api.get(`/posts/by_category/?category=${categoryParam}`);
        setActiveFilterDescription(`Posts in category: ${categoryParam}`);
      } else if (searchQuery.trim()) {
        res = await api.get(`/posts/?search=${searchQuery.trim()}`);
        setActiveFilterDescription(`Search results for "${searchQuery}"`);
      } else {
        res = await api.get('/posts/');
        setActiveFilterDescription('All Posts');
      }
      setPosts(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch explore posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorePosts();
  }, [tagParam, categoryParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Clear URL parameters when doing a text search
    setSearchParams({});
    fetchExplorePosts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  return (
    <div className="explore-page-container">
      {/* Search Header */}
      <header className="explore-header glass-panel">
        <form onSubmit={handleSearchSubmit} className="explore-search-form">
          <Search className="search-box-icon" />
          <input
            type="text"
            className="glass-input search-box-input"
            placeholder="Search posts, tags, categories, or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary search-box-btn">
            Search
          </button>
        </form>

        <div className="active-filters-info">
          <div className="filter-summary">
            <Compass className="filter-icon-compass" />
            <span>{activeFilterDescription}</span>
          </div>
          {(tagParam || categoryParam || searchQuery) && (
            <button className="clear-filter-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </header>

      {/* Explore Grid Content */}
      <main className="explore-content">
        {loading ? (
          <div className="feed-loading">
            <div className="spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-explore glass-panel">
            <Hash className="empty-hash-icon" />
            <h3>No Results Found</h3>
            <p>We couldn't find any posts matching the criteria. Try adjusting your search query or filters.</p>
            <button className="btn-secondary" onClick={clearFilters}>
              Show All Posts
            </button>
          </div>
        ) : (
          <div className="explore-grid-layout">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onUpdate={handlePostUpdate} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
