import React, { useState, useEffect, useMemo } from 'react';
import { LinkItem, Category, SharedCategoryPayload } from './types';
import { getLinks, saveLinks, createLink, getCategories, saveCategories, createCategory, parseSharePayload, incrementLinkTap } from './services/storageService';
import { isUserPremium, setSubscriptionStatus, logAnalytics } from './services/subscriptionService';
import { LinkCard } from './components/LinkCard';
import { LinkModal } from './components/LinkModal';
import { ImportModal } from './components/ImportModal';
import { PremiumModal } from './components/PremiumModal';
import { EmptyState } from './components/EmptyState';
import { Icons } from './components/Icon';

const App: React.FC = () => {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Subscription State
  const [isPremium, setIsPremium] = useState(false);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // Share/Import States
  const [importPayload, setImportPayload] = useState<SharedCategoryPayload | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');

  // Load data and check URL for shares on mount
  useEffect(() => {
    setLinks(getLinks());
    setCategories(getCategories());
    setIsPremium(isUserPremium());

    // Listen for storage/dispatch events for subscription changes
    const handleSubChange = () => setIsPremium(isUserPremium());
    window.addEventListener('subscription-change', handleSubChange);

    // Check for share param
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      const payload = parseSharePayload(shareData);
      if (payload) {
        setImportPayload(payload);
        setIsImportModalOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    
    return () => window.removeEventListener('subscription-change', handleSubChange);
  }, []);

  // Filter and Search Logic
  const filteredLinks = useMemo(() => {
    let result = links;

    if (activeFilter === 'favorites') {
      result = result.filter(link => link.isFavorite);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(link => 
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        link.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (link.description && link.description.toLowerCase().includes(query)) ||
        categories.find(c => c.id === link.categoryId)?.name.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [links, searchQuery, activeFilter, categories]);

  const handleSaveLink = (url: string, title: string, description: string, tags: string[], categoryId: string, isCustomTitle: boolean) => {
    let newLinks = [...links];
    
    if (editingLink) {
      newLinks = newLinks.map(link => 
        link.id === editingLink.id 
          ? { ...link, url, title, description, tags, categoryId, isCustomTitle } 
          : link
      );
    } else {
      // Logic for new link creation (handled in LinkModal, passed here)
      const newLink = createLink(url, title, description, tags, categoryId, isCustomTitle);
      newLinks = [newLink, ...newLinks];
    }

    setLinks(newLinks);
    saveLinks(newLinks);
    setEditingLink(null);
  };

  const handleCreateCategory = (name: string) => {
    const newCat = createCategory(name);
    const newCategories = [...categories, newCat];
    setCategories(newCategories);
    saveCategories(newCategories);
    return newCat;
  };

  // --- IMPORT LOGIC ---
  const handleConfirmImport = () => {
    if (!importPayload) return;

    let catName = importPayload.name;
    if (categories.some(c => c.name === catName)) {
      catName = `${catName} (Imported)`;
    }
    
    const newCat = handleCreateCategory(catName);
    
    // Imported links are treated as "Auto" titles (Free) initially
    const newLinksToAdd = importPayload.links.map(l => 
      createLink(l.url, l.title, l.description || '', l.tags, newCat.id, false)
    );

    const updatedLinks = [...newLinksToAdd, ...links];
    setLinks(updatedLinks);
    saveLinks(updatedLinks);

    setIsImportModalOpen(false);
    setImportPayload(null);
    alert(`Imported "${catName}" with ${newLinksToAdd.length} links.`);
  };

  const handleDeleteLink = (id: string) => {
    if (window.confirm('Remove this link?')) {
      const newLinks = links.filter(link => link.id !== id);
      setLinks(newLinks);
      saveLinks(newLinks);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const newLinks = links.map(link => 
      link.id === id ? { ...link, isFavorite: !link.isFavorite } : link
    );
    setLinks(newLinks);
    saveLinks(newLinks);
  };

  const handleLinkTap = (id: string) => {
    const updated = incrementLinkTap(id, links);
    setLinks(updated);
  };

  const openEditModal = (link: LinkItem) => {
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingLink(null);
    setIsModalOpen(true);
  };

  // DEV TOOL: Toggle Subscription Status
  const handleTogglePremiumDev = () => {
    const newStatus = isPremium ? 'FREE' : 'PREMIUM_ACTIVE';
    setSubscriptionStatus(newStatus);
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Inbox';
  };

  return (
    <div className="flex flex-col h-full bg-sys-bg text-sys-text relative max-w-lg mx-auto overflow-hidden transition-colors duration-300">
      
      {/* iOS Navigation Bar */}
      <header className="flex-shrink-0 sticky top-0 z-30 pt-safe-top glass-blur border-b border-sys-border transition-colors duration-300">
        <div className="px-5 pt-2 pb-2">
          
          {/* Top Row */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <h1 className="text-[32px] font-bold text-sys-text tracking-tight font-display">
              Keepo
            </h1>
            
            <div className="flex items-center gap-3">
              {/* DEV TOGGLE FOR SUBSCRIPTION */}
              <button 
                onClick={handleTogglePremiumDev}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isPremium ? 'bg-yellow-400/20 text-yellow-600' : 'bg-sys-border text-sys-subtext'}`}
                aria-label="Toggle Premium Dev"
              >
                {isPremium ? <Icons.Star className="w-5 h-5 fill-yellow-600" /> : <Icons.Lock className="w-4 h-4" />}
              </button>

              <button 
                onClick={openCreateModal}
                className="w-9 h-9 rounded-full bg-sys-text text-sys-card flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200 hover:opacity-90"
                aria-label="Add Link"
              >
                <Icons.Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icons.Search className="h-4 w-4 text-sys-subtext transition-colors group-focus-within:text-sys-accent" />
            </div>
            <input
              type="text"
              placeholder="Search links, tags, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-4 py-2.5 bg-sys-border/30 border-none rounded-xl text-[16px] text-sys-text placeholder-sys-subtext/70 focus:bg-sys-card focus:shadow-sm focus:ring-1 focus:ring-sys-border outline-none transition-all duration-200"
            />
          </div>

          {/* Segmented Control */}
          <div className="flex gap-6">
             <button 
              onClick={() => setActiveFilter('all')}
              className={`text-[15px] font-medium pb-2 transition-all duration-200 relative ${activeFilter === 'all' ? 'text-sys-text' : 'text-sys-subtext'}`}
            >
              All Links
              {activeFilter === 'all' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-sys-text rounded-full animate-fade-in"></span>}
            </button>
            <button 
              onClick={() => setActiveFilter('favorites')}
              className={`text-[15px] font-medium pb-2 transition-all duration-200 relative ${activeFilter === 'favorites' ? 'text-sys-text' : 'text-sys-subtext'}`}
            >
              Favorites
              {activeFilter === 'favorites' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-sys-accent rounded-full animate-fade-in"></span>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-safe-bottom scroll-smooth">
        {filteredLinks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3 pb-24">
            {filteredLinks.map(link => (
              <LinkCard 
                key={link.id} 
                link={link} 
                categoryName={getCategoryName(link.categoryId)}
                onDelete={handleDeleteLink}
                onEdit={openEditModal}
                onToggleFavorite={handleToggleFavorite}
                onTap={handleLinkTap}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit/Create Modal */}
      <LinkModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveLink}
        initialData={editingLink}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        links={links} 
        isPremium={isPremium}
        onTriggerPremium={() => {
            logAnalytics('premium_cta_clicked', { source: 'link_modal' });
            setIsPremiumModalOpen(true);
        }}
      />

      {/* Import / Share Preview Modal */}
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleConfirmImport}
        payload={importPayload}
      />

      {/* Premium Upsell Modal */}
      <PremiumModal 
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        onSuccess={() => {
            setIsPremiumModalOpen(false);
            alert("Welcome to Premium! (Sandbox)");
        }}
      />
    </div>
  );
};

export default App;