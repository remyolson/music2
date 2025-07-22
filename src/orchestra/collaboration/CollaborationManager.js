import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * CollaborationManager - Project sharing and collaboration features
 * Handles project sharing, version control, comments, and real-time collaboration
 */
export class CollaborationManager {
  constructor() {
    this.registry = new DisposalRegistry('collaboration-manager');
    
    // Version control
    this.versionControl = new VersionControl();
    this.registry.register(this.versionControl);
    
    // Comment system
    this.commentSystem = new CommentSystem();
    this.registry.register(this.commentSystem);
    
    // Project sharing
    this.projectSharing = new ProjectSharing();
    this.registry.register(this.projectSharing);
    
    // Real-time collaboration (future)
    this.realtimeCollab = new RealtimeCollaboration();
    this.registry.register(this.realtimeCollab);
    
    // Current project
    this.currentProject = null;
    this.currentVersion = null;
  }

  /**
   * Initialize project for collaboration
   * @param {Object} project 
   */
  initializeProject(project) {
    this.currentProject = project;
    
    // Create initial version
    this.currentVersion = this.versionControl.createInitialVersion(project);
    
    // Initialize systems
    this.commentSystem.setProject(project.id);
    this.projectSharing.setProject(project);
  }

  /**
   * Save new version
   * @param {Object} changes 
   * @param {string} message 
   * @returns {Object}
   */
  saveVersion(changes, message) {
    if (!this.currentProject) return null;
    
    const version = this.versionControl.createVersion({
      project: this.currentProject,
      changes,
      message,
      parentVersion: this.currentVersion
    });
    
    this.currentVersion = version;
    return version;
  }

  /**
   * Get version history
   * @returns {Array}
   */
  getVersionHistory() {
    if (!this.currentProject) return [];
    
    return this.versionControl.getHistory(this.currentProject.id);
  }

  /**
   * Checkout version
   * @param {string} versionId 
   * @returns {Object}
   */
  checkoutVersion(versionId) {
    const version = this.versionControl.getVersion(versionId);
    if (!version) return null;
    
    // Apply version to current project
    this.currentProject = this.versionControl.applyVersion(this.currentProject, version);
    this.currentVersion = version;
    
    return this.currentProject;
  }

  /**
   * Compare versions
   * @param {string} versionId1 
   * @param {string} versionId2 
   * @returns {Object}
   */
  compareVersions(versionId1, versionId2) {
    return this.versionControl.compareVersions(versionId1, versionId2);
  }

  /**
   * Add comment
   * @param {Object} comment 
   * @returns {Object}
   */
  addComment(comment) {
    return this.commentSystem.addComment(comment);
  }

  /**
   * Get comments
   * @param {Object} filter 
   * @returns {Array}
   */
  getComments(filter = {}) {
    return this.commentSystem.getComments(filter);
  }

  /**
   * Reply to comment
   * @param {string} commentId 
   * @param {Object} reply 
   * @returns {Object}
   */
  replyToComment(commentId, reply) {
    return this.commentSystem.addReply(commentId, reply);
  }

  /**
   * Resolve comment
   * @param {string} commentId 
   * @returns {boolean}
   */
  resolveComment(commentId) {
    return this.commentSystem.resolveComment(commentId);
  }

  /**
   * Share project
   * @param {Object} options 
   * @returns {Object}
   */
  async shareProject(options = {}) {
    if (!this.currentProject) return null;
    
    return this.projectSharing.createShare(this.currentProject, options);
  }

  /**
   * Get share info
   * @param {string} shareId 
   * @returns {Object}
   */
  getShareInfo(shareId) {
    return this.projectSharing.getShareInfo(shareId);
  }

  /**
   * Update share settings
   * @param {string} shareId 
   * @param {Object} settings 
   * @returns {boolean}
   */
  updateShareSettings(shareId, settings) {
    return this.projectSharing.updateSettings(shareId, settings);
  }

  /**
   * Join collaboration session
   * @param {string} sessionId 
   * @returns {Promise<boolean>}
   */
  async joinSession(sessionId) {
    return this.realtimeCollab.joinSession(sessionId);
  }

  /**
   * Leave collaboration session
   */
  leaveSession() {
    this.realtimeCollab.leaveSession();
  }

  /**
   * Get active collaborators
   * @returns {Array}
   */
  getActiveCollaborators() {
    return this.realtimeCollab.getActiveUsers();
  }

  /**
   * Broadcast change
   * @param {Object} change 
   */
  broadcastChange(change) {
    if (this.realtimeCollab.isConnected()) {
      this.realtimeCollab.broadcastChange(change);
    }
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Version control system
 */
class VersionControl {
  constructor() {
    this.registry = new DisposalRegistry('version-control');
    
    // Version storage
    this.versions = new Map();
    this.history = new Map(); // projectId -> version list
    
    // Diff engine
    this.diffEngine = new DiffEngine();
    this.registry.register(this.diffEngine);
  }

  /**
   * Create initial version
   * @param {Object} project 
   * @returns {Object}
   */
  createInitialVersion(project) {
    const version = {
      id: this.generateVersionId(),
      projectId: project.id,
      timestamp: Date.now(),
      author: this.getCurrentUser(),
      message: 'Initial version',
      parentVersion: null,
      snapshot: this.createSnapshot(project),
      changes: null
    };
    
    this.versions.set(version.id, version);
    
    if (!this.history.has(project.id)) {
      this.history.set(project.id, []);
    }
    this.history.get(project.id).push(version);
    
    return version;
  }

  /**
   * Create new version
   * @param {Object} config 
   * @returns {Object}
   */
  createVersion(config) {
    const { project, changes, message, parentVersion } = config;
    
    const version = {
      id: this.generateVersionId(),
      projectId: project.id,
      timestamp: Date.now(),
      author: this.getCurrentUser(),
      message,
      parentVersion: parentVersion?.id || null,
      changes: this.compressChanges(changes),
      snapshot: null // Only store snapshots periodically
    };
    
    // Store snapshot every 10 versions
    const history = this.history.get(project.id) || [];
    if (history.length % 10 === 0) {
      version.snapshot = this.createSnapshot(project);
    }
    
    this.versions.set(version.id, version);
    history.push(version);
    
    return version;
  }

  /**
   * Get version
   * @param {string} versionId 
   * @returns {Object}
   */
  getVersion(versionId) {
    return this.versions.get(versionId);
  }

  /**
   * Get history
   * @param {string} projectId 
   * @returns {Array}
   */
  getHistory(projectId) {
    const history = this.history.get(projectId) || [];
    
    return history.map(version => ({
      id: version.id,
      timestamp: version.timestamp,
      author: version.author,
      message: version.message,
      hasSnapshot: !!version.snapshot
    }));
  }

  /**
   * Apply version
   * @param {Object} currentProject 
   * @param {Object} targetVersion 
   * @returns {Object}
   */
  applyVersion(currentProject, targetVersion) {
    // Find nearest snapshot
    const snapshot = this.findNearestSnapshot(targetVersion);
    if (!snapshot) return currentProject;
    
    // Rebuild project from snapshot
    let project = JSON.parse(JSON.stringify(snapshot));
    
    // Apply changes from snapshot to target version
    const changes = this.collectChanges(snapshot.versionId, targetVersion.id);
    changes.forEach(change => {
      project = this.applyChange(project, change);
    });
    
    return project;
  }

  /**
   * Compare versions
   * @param {string} versionId1 
   * @param {string} versionId2 
   * @returns {Object}
   */
  compareVersions(versionId1, versionId2) {
    const version1 = this.getVersion(versionId1);
    const version2 = this.getVersion(versionId2);
    
    if (!version1 || !version2) return null;
    
    // Reconstruct projects at each version
    const project1 = this.reconstructProject(version1);
    const project2 = this.reconstructProject(version2);
    
    // Generate diff
    return this.diffEngine.createDiff(project1, project2);
  }

  /**
   * Generate version ID
   * @returns {string}
   */
  generateVersionId() {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user
   * @returns {Object}
   */
  getCurrentUser() {
    // In real implementation, would get from auth system
    return {
      id: 'user_1',
      name: 'Current User',
      email: 'user@example.com'
    };
  }

  /**
   * Create snapshot
   * @param {Object} project 
   * @returns {Object}
   */
  createSnapshot(project) {
    return {
      ...JSON.parse(JSON.stringify(project)),
      snapshotTimestamp: Date.now()
    };
  }

  /**
   * Compress changes
   * @param {Object} changes 
   * @returns {Object}
   */
  compressChanges(changes) {
    // Simple compression - in real implementation would use better algorithm
    return {
      compressed: true,
      data: JSON.stringify(changes)
    };
  }

  /**
   * Find nearest snapshot
   * @param {Object} version 
   * @returns {Object|null}
   */
  findNearestSnapshot(version) {
    const history = this.history.get(version.projectId) || [];
    
    // Search backwards for snapshot
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].snapshot && history[i].timestamp <= version.timestamp) {
        return history[i].snapshot;
      }
    }
    
    return null;
  }

  /**
   * Collect changes between versions
   * @param {string} fromVersionId 
   * @param {string} toVersionId 
   * @returns {Array}
   */
  collectChanges(fromVersionId, toVersionId) {
    const changes = [];
    // Implementation would collect all changes between versions
    return changes;
  }

  /**
   * Apply change to project
   * @param {Object} project 
   * @param {Object} change 
   * @returns {Object}
   */
  applyChange(project, change) {
    // Apply individual change to project
    return project;
  }

  /**
   * Reconstruct project at version
   * @param {Object} version 
   * @returns {Object}
   */
  reconstructProject(version) {
    // Reconstruct project state at specific version
    return this.applyVersion({}, version);
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Diff engine for comparing versions
 */
class DiffEngine {
  constructor() {
    this.registry = new DisposalRegistry('diff-engine');
  }

  /**
   * Create diff between projects
   * @param {Object} project1 
   * @param {Object} project2 
   * @returns {Object}
   */
  createDiff(project1, project2) {
    const diff = {
      added: [],
      removed: [],
      modified: [],
      moved: []
    };
    
    // Compare tracks
    const tracks1 = new Map(project1.tracks?.map(t => [t.id, t]) || []);
    const tracks2 = new Map(project2.tracks?.map(t => [t.id, t]) || []);
    
    // Find removed tracks
    tracks1.forEach((track, id) => {
      if (!tracks2.has(id)) {
        diff.removed.push({ type: 'track', id, data: track });
      }
    });
    
    // Find added and modified tracks
    tracks2.forEach((track, id) => {
      if (!tracks1.has(id)) {
        diff.added.push({ type: 'track', id, data: track });
      } else {
        const changes = this.compareObjects(tracks1.get(id), track);
        if (changes.length > 0) {
          diff.modified.push({ type: 'track', id, changes });
        }
      }
    });
    
    // Compare other elements (tempo, key, etc.)
    const metaChanges = this.compareObjects(
      this.extractMetadata(project1),
      this.extractMetadata(project2)
    );
    
    if (metaChanges.length > 0) {
      diff.modified.push({ type: 'metadata', changes: metaChanges });
    }
    
    return diff;
  }

  /**
   * Compare objects
   * @param {Object} obj1 
   * @param {Object} obj2 
   * @returns {Array}
   */
  compareObjects(obj1, obj2) {
    const changes = [];
    
    // Simple comparison - real implementation would be more sophisticated
    Object.keys(obj2).forEach(key => {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        changes.push({
          path: key,
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    });
    
    return changes;
  }

  /**
   * Extract metadata
   * @param {Object} project 
   * @returns {Object}
   */
  extractMetadata(project) {
    return {
      title: project.title,
      composer: project.composer,
      tempo: project.tempo,
      timeSignature: project.timeSignature,
      keySignature: project.keySignature
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Comment system
 */
class CommentSystem {
  constructor() {
    this.registry = new DisposalRegistry('comment-system');
    
    // Comment storage
    this.comments = new Map();
    this.replies = new Map(); // commentId -> replies
    
    // Current project
    this.currentProjectId = null;
  }

  /**
   * Set current project
   * @param {string} projectId 
   */
  setProject(projectId) {
    this.currentProjectId = projectId;
  }

  /**
   * Add comment
   * @param {Object} comment 
   * @returns {Object}
   */
  addComment(comment) {
    const newComment = {
      id: this.generateCommentId(),
      projectId: this.currentProjectId,
      timestamp: Date.now(),
      author: this.getCurrentUser(),
      text: comment.text,
      type: comment.type || 'general', // 'general', 'revision', 'technical'
      measure: comment.measure || null,
      track: comment.track || null,
      resolved: false,
      ...comment
    };
    
    this.comments.set(newComment.id, newComment);
    
    return newComment;
  }

  /**
   * Get comments
   * @param {Object} filter 
   * @returns {Array}
   */
  getComments(filter = {}) {
    const comments = [];
    
    this.comments.forEach(comment => {
      if (comment.projectId !== this.currentProjectId) return;
      
      // Apply filters
      if (filter.type && comment.type !== filter.type) return;
      if (filter.measure && comment.measure !== filter.measure) return;
      if (filter.track && comment.track !== filter.track) return;
      if (filter.resolved !== undefined && comment.resolved !== filter.resolved) return;
      
      // Include replies
      const replies = this.replies.get(comment.id) || [];
      
      comments.push({
        ...comment,
        replies
      });
    });
    
    // Sort by timestamp
    return comments.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add reply
   * @param {string} commentId 
   * @param {Object} reply 
   * @returns {Object}
   */
  addReply(commentId, reply) {
    const comment = this.comments.get(commentId);
    if (!comment) return null;
    
    const newReply = {
      id: this.generateCommentId(),
      commentId,
      timestamp: Date.now(),
      author: this.getCurrentUser(),
      text: reply.text
    };
    
    if (!this.replies.has(commentId)) {
      this.replies.set(commentId, []);
    }
    
    this.replies.get(commentId).push(newReply);
    
    return newReply;
  }

  /**
   * Resolve comment
   * @param {string} commentId 
   * @returns {boolean}
   */
  resolveComment(commentId) {
    const comment = this.comments.get(commentId);
    if (!comment) return false;
    
    comment.resolved = true;
    comment.resolvedBy = this.getCurrentUser();
    comment.resolvedAt = Date.now();
    
    return true;
  }

  /**
   * Delete comment
   * @param {string} commentId 
   * @returns {boolean}
   */
  deleteComment(commentId) {
    const comment = this.comments.get(commentId);
    if (!comment) return false;
    
    // Only author can delete
    if (comment.author.id !== this.getCurrentUser().id) return false;
    
    this.comments.delete(commentId);
    this.replies.delete(commentId);
    
    return true;
  }

  /**
   * Generate comment ID
   * @returns {string}
   */
  generateCommentId() {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user
   * @returns {Object}
   */
  getCurrentUser() {
    return {
      id: 'user_1',
      name: 'Current User',
      avatar: null
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Project sharing system
 */
class ProjectSharing {
  constructor() {
    this.registry = new DisposalRegistry('project-sharing');
    
    // Share storage
    this.shares = new Map();
    
    // Current project
    this.currentProject = null;
  }

  /**
   * Set current project
   * @param {Object} project 
   */
  setProject(project) {
    this.currentProject = project;
  }

  /**
   * Create share
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Object}
   */
  async createShare(project, options = {}) {
    const {
      permissions = 'view', // 'view', 'comment', 'edit'
      expiresIn = null, // hours
      password = null,
      includeAudio = true,
      compressedPreview = true
    } = options;
    
    const share = {
      id: this.generateShareId(),
      projectId: project.id,
      createdBy: this.getCurrentUser(),
      createdAt: Date.now(),
      permissions,
      expiresAt: expiresIn ? Date.now() + expiresIn * 3600000 : null,
      password: password ? this.hashPassword(password) : null,
      accessCount: 0,
      lastAccessed: null
    };
    
    // Create preview if requested
    if (compressedPreview) {
      share.preview = await this.createPreview(project, includeAudio);
    }
    
    this.shares.set(share.id, share);
    
    return {
      shareId: share.id,
      url: this.generateShareUrl(share.id),
      permissions,
      expiresAt: share.expiresAt
    };
  }

  /**
   * Get share info
   * @param {string} shareId 
   * @returns {Object}
   */
  getShareInfo(shareId) {
    const share = this.shares.get(shareId);
    if (!share) return null;
    
    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      this.shares.delete(shareId);
      return null;
    }
    
    return {
      id: share.id,
      projectId: share.projectId,
      permissions: share.permissions,
      createdBy: share.createdBy,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      hasPassword: !!share.password,
      accessCount: share.accessCount
    };
  }

  /**
   * Access share
   * @param {string} shareId 
   * @param {string} password 
   * @returns {Object|null}
   */
  accessShare(shareId, password = null) {
    const share = this.shares.get(shareId);
    if (!share) return null;
    
    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      this.shares.delete(shareId);
      return null;
    }
    
    // Check password
    if (share.password && !this.verifyPassword(password, share.password)) {
      return null;
    }
    
    // Update access info
    share.accessCount++;
    share.lastAccessed = Date.now();
    
    // Return project with appropriate permissions
    return {
      project: share.preview || this.currentProject,
      permissions: share.permissions
    };
  }

  /**
   * Update share settings
   * @param {string} shareId 
   * @param {Object} settings 
   * @returns {boolean}
   */
  updateSettings(shareId, settings) {
    const share = this.shares.get(shareId);
    if (!share) return false;
    
    // Only creator can update
    if (share.createdBy.id !== this.getCurrentUser().id) return false;
    
    // Update allowed settings
    if (settings.permissions !== undefined) {
      share.permissions = settings.permissions;
    }
    
    if (settings.expiresIn !== undefined) {
      share.expiresAt = settings.expiresIn ? 
        Date.now() + settings.expiresIn * 3600000 : null;
    }
    
    if (settings.password !== undefined) {
      share.password = settings.password ? 
        this.hashPassword(settings.password) : null;
    }
    
    return true;
  }

  /**
   * Revoke share
   * @param {string} shareId 
   * @returns {boolean}
   */
  revokeShare(shareId) {
    const share = this.shares.get(shareId);
    if (!share) return false;
    
    // Only creator can revoke
    if (share.createdBy.id !== this.getCurrentUser().id) return false;
    
    this.shares.delete(shareId);
    return true;
  }

  /**
   * Create preview
   * @param {Object} project 
   * @param {boolean} includeAudio 
   * @returns {Promise<Object>}
   */
  async createPreview(project, includeAudio) {
    const preview = {
      title: project.title,
      composer: project.composer,
      duration: project.duration,
      tempo: project.tempo,
      timeSignature: project.timeSignature,
      keySignature: project.keySignature,
      trackCount: project.tracks?.length || 0,
      measureCount: project.measures?.length || 0
    };
    
    if (includeAudio) {
      // Create compressed audio preview
      preview.audioPreview = await this.createAudioPreview(project);
    }
    
    return preview;
  }

  /**
   * Create audio preview
   * @param {Object} project 
   * @returns {Promise<string>}
   */
  async createAudioPreview(project) {
    // Would render a compressed preview (e.g., 30 seconds, low bitrate MP3)
    return 'data:audio/mp3;base64,...'; // Placeholder
  }

  /**
   * Generate share ID
   * @returns {string}
   */
  generateShareId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate share URL
   * @param {string} shareId 
   * @returns {string}
   */
  generateShareUrl(shareId) {
    return `${window.location.origin}/share/${shareId}`;
  }

  /**
   * Hash password
   * @param {string} password 
   * @returns {string}
   */
  hashPassword(password) {
    // Simple hash - in production would use bcrypt or similar
    return btoa(password);
  }

  /**
   * Verify password
   * @param {string} password 
   * @param {string} hash 
   * @returns {boolean}
   */
  verifyPassword(password, hash) {
    return btoa(password) === hash;
  }

  /**
   * Get current user
   * @returns {Object}
   */
  getCurrentUser() {
    return {
      id: 'user_1',
      name: 'Current User'
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Real-time collaboration
 */
class RealtimeCollaboration {
  constructor() {
    this.registry = new DisposalRegistry('realtime-collaboration');
    
    // WebSocket connection
    this.socket = null;
    this.sessionId = null;
    
    // Active users
    this.activeUsers = new Map();
    
    // Change buffer
    this.changeBuffer = [];
    this.syncInterval = null;
    
    // Conflict resolution
    this.conflictResolver = new ConflictResolver();
    this.registry.register(this.conflictResolver);
  }

  /**
   * Join session
   * @param {string} sessionId 
   * @returns {Promise<boolean>}
   */
  async joinSession(sessionId) {
    try {
      // In production, would connect to WebSocket server
      this.sessionId = sessionId;
      
      // Simulate connection
      this.simulateConnection();
      
      // Start sync interval
      this.syncInterval = setInterval(() => {
        this.syncChanges();
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Failed to join session:', error);
      return false;
    }
  }

  /**
   * Leave session
   */
  leaveSession() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.sessionId = null;
    this.activeUsers.clear();
    this.changeBuffer = [];
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get active users
   * @returns {Array}
   */
  getActiveUsers() {
    return Array.from(this.activeUsers.values());
  }

  /**
   * Broadcast change
   * @param {Object} change 
   */
  broadcastChange(change) {
    if (!this.isConnected()) return;
    
    const message = {
      type: 'change',
      sessionId: this.sessionId,
      userId: this.getCurrentUser().id,
      timestamp: Date.now(),
      change
    };
    
    this.changeBuffer.push(message);
  }

  /**
   * Sync changes
   */
  syncChanges() {
    if (this.changeBuffer.length === 0) return;
    
    // Send buffered changes
    const changes = this.changeBuffer.splice(0);
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'sync',
        changes
      }));
    }
  }

  /**
   * Handle incoming message
   * @param {Object} message 
   */
  handleMessage(message) {
    switch (message.type) {
      case 'userJoined':
        this.handleUserJoined(message.user);
        break;
        
      case 'userLeft':
        this.handleUserLeft(message.userId);
        break;
        
      case 'change':
        this.handleRemoteChange(message.change);
        break;
        
      case 'sync':
        this.handleSync(message.changes);
        break;
        
      case 'conflict':
        this.handleConflict(message.conflict);
        break;
    }
  }

  /**
   * Handle user joined
   * @param {Object} user 
   */
  handleUserJoined(user) {
    this.activeUsers.set(user.id, {
      ...user,
      joinedAt: Date.now(),
      cursor: null
    });
    
    if (this.onUserJoined) {
      this.onUserJoined(user);
    }
  }

  /**
   * Handle user left
   * @param {string} userId 
   */
  handleUserLeft(userId) {
    this.activeUsers.delete(userId);
    
    if (this.onUserLeft) {
      this.onUserLeft(userId);
    }
  }

  /**
   * Handle remote change
   * @param {Object} change 
   */
  handleRemoteChange(change) {
    // Apply change if no conflict
    const conflict = this.conflictResolver.checkConflict(change, this.changeBuffer);
    
    if (!conflict) {
      if (this.onRemoteChange) {
        this.onRemoteChange(change);
      }
    } else {
      this.handleConflict(conflict);
    }
  }

  /**
   * Handle sync
   * @param {Array} changes 
   */
  handleSync(changes) {
    changes.forEach(change => {
      this.handleRemoteChange(change);
    });
  }

  /**
   * Handle conflict
   * @param {Object} conflict 
   */
  handleConflict(conflict) {
    const resolution = this.conflictResolver.resolveConflict(conflict);
    
    if (this.onConflict) {
      this.onConflict(conflict, resolution);
    }
  }

  /**
   * Simulate connection (for demo)
   */
  simulateConnection() {
    // In production, would establish WebSocket connection
    this.socket = {
      readyState: WebSocket.OPEN,
      send: (data) => {
        console.log('Would send:', data);
      },
      close: () => {
        console.log('Connection closed');
      }
    };
    
    // Simulate other users
    setTimeout(() => {
      this.handleUserJoined({
        id: 'user_2',
        name: 'Collaborator 1',
        color: '#FF5722'
      });
    }, 1000);
  }

  /**
   * Get current user
   * @returns {Object}
   */
  getCurrentUser() {
    return {
      id: 'user_1',
      name: 'Current User',
      color: '#2196F3'
    };
  }

  dispose() {
    this.leaveSession();
    this.registry.dispose();
  }
}

/**
 * Conflict resolver
 */
class ConflictResolver {
  constructor() {
    this.registry = new DisposalRegistry('conflict-resolver');
  }

  /**
   * Check for conflicts
   * @param {Object} remoteChange 
   * @param {Array} localChanges 
   * @returns {Object|null}
   */
  checkConflict(remoteChange, localChanges) {
    for (const localChange of localChanges) {
      if (this.changesConflict(remoteChange, localChange)) {
        return {
          remote: remoteChange,
          local: localChange,
          type: this.getConflictType(remoteChange, localChange)
        };
      }
    }
    
    return null;
  }

  /**
   * Check if changes conflict
   * @param {Object} change1 
   * @param {Object} change2 
   * @returns {boolean}
   */
  changesConflict(change1, change2) {
    // Same element modified
    if (change1.elementId === change2.elementId) {
      return true;
    }
    
    // Overlapping measures
    if (change1.measure && change2.measure) {
      return this.measuresOverlap(change1.measure, change2.measure);
    }
    
    return false;
  }

  /**
   * Get conflict type
   * @param {Object} change1 
   * @param {Object} change2 
   * @returns {string}
   */
  getConflictType(change1, change2) {
    if (change1.type === 'delete' || change2.type === 'delete') {
      return 'delete';
    }
    
    if (change1.property === change2.property) {
      return 'update';
    }
    
    return 'general';
  }

  /**
   * Check if measures overlap
   * @param {Object} measure1 
   * @param {Object} measure2 
   * @returns {boolean}
   */
  measuresOverlap(measure1, measure2) {
    return measure1.start < measure2.end && measure2.start < measure1.end;
  }

  /**
   * Resolve conflict
   * @param {Object} conflict 
   * @returns {Object}
   */
  resolveConflict(conflict) {
    const strategy = this.getResolutionStrategy(conflict.type);
    
    switch (strategy) {
      case 'lastWrite':
        return conflict.remote.timestamp > conflict.local.timestamp ? 
          conflict.remote : conflict.local;
        
      case 'merge':
        return this.mergeChanges(conflict.remote, conflict.local);
        
      case 'manual':
        return { requiresManualResolution: true, conflict };
        
      default:
        return conflict.remote; // Default to remote
    }
  }

  /**
   * Get resolution strategy
   * @param {string} conflictType 
   * @returns {string}
   */
  getResolutionStrategy(conflictType) {
    const strategies = {
      'delete': 'manual',
      'update': 'lastWrite',
      'general': 'merge'
    };
    
    return strategies[conflictType] || 'lastWrite';
  }

  /**
   * Merge changes
   * @param {Object} change1 
   * @param {Object} change2 
   * @returns {Object}
   */
  mergeChanges(change1, change2) {
    // Simple merge - in production would be more sophisticated
    return {
      ...change1,
      ...change2,
      merged: true,
      mergedAt: Date.now()
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createCollaborationManager() {
  return new CollaborationManager();
}