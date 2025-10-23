# Task Manager Application Documentation

## Overview
Your Task Manager is a full-stack application that helps you organize and track tasks, projects, and team collaboration. Built with React, Node.js, and PostgreSQL, it supports both web and mobile platforms.

## 🚀 Quick Start

### Accessing Your Application
- **Web Dashboard**: Visit /dashboard to manage your tasks
- **Mobile App**: Available through Expo for iOS/Android
- **File Management**: Use /file-storage for Google Drive sync

### First Time Setup
1. Visit your homepage at /
2. Upload an Excel/CSV file to import existing data, OR
3. Skip setup to use with sample data
4. Navigate to /dashboard to start managing tasks

## 📋 Core Features

### Task Management
- **Create Tasks**: Add new tasks with titles, descriptions, priorities
- **Status Tracking**: Pending → In Progress → Completed → Cancelled
- **Priority Levels**: Low, Medium, High
- **Due Dates**: Set and track deadlines
- **Categories**: Organize tasks by category
- **Assignees**: Assign tasks to team members

### Project Organization
- **Project Creation**: Group related tasks under projects
- **Project Status**: Active, Completed, Archived
- **Project Priorities**: Low, Medium, High
- **Project Analytics**: Track progress and completion rates

### Data Management
- **File Import**: Support for Excel (.xlsx, .xls), CSV, and JSON
- **Google Drive Sync**: Real-time synchronization with Google Drive
- **Local Storage**: Browser-based storage option
- **Export Options**: Download data as JSON or CSV

### Advanced Features
- **User Authentication**: Secure login system (ready to enable)
- **Real-time Updates**: Live data synchronization
- **Mobile Responsive**: Works perfectly on all devices
- **Analytics Dashboard**: Visual insights into your productivity

## 🎯 How to Use

### Creating Your First Task
1. Go to /dashboard
2. Click the "+" floating action button
3. Fill in task details:
   - **Title** (required)
   - **Description** (optional)
   - **Priority** (Low/Medium/High)
   - **Status** (Pending/In Progress/Completed)
   - **Due Date** (optional)
   - **Category** (optional)
   - **Assignee** (optional)

### Managing Projects
1. Navigate to the Projects section
2. Click "Add Project"
3. Set project name, description, and priority
4. Assign tasks to projects during task creation

### File Storage Options

#### Browser Storage (Default)
- Data stored locally in your browser
- Fast and reliable
- Limited to single device

#### Google Drive Sync
1. Go to /file-storage
2. Click "Connect to Google Drive"
3. Authorize the application
4. Your data syncs automatically across devices

#### File Import/Export
- **Import**: Upload Excel/CSV files to populate your task list
- **Export**: Download your data as JSON or CSV files

### Filtering and Search
- Filter tasks by status, priority, or category
- Use the search bar to find specific tasks
- Sort by due date, priority, or creation date

## 🛠 Technical Details

### Technology Stack
- **Frontend**: React 18, Next.js App Router, Tailwind CSS
- **Backend**: Node.js, PostgreSQL
- **Mobile**: React Native, Expo Router
- **State Management**: TanStack Query, Zustand
- **Authentication**: Ready to enable email/Google/social login

### Database Schema
#### Tasks Table
- id: Primary key
- title: Task title (required)
- description: Task details
- status: pending | in_progress | completed | cancelled
- priority: low | medium | high
- project_id: Foreign key to projects
- assignee: Person assigned
- due_date: Deadline
- category: Task category
- user_id: User ownership

#### Projects Table
- id: Primary key  
- name: Project name
- description: Project details
- priority: low | medium | high
- status: active | completed | archived
- user_id: User ownership

### API Endpoints
- GET/POST /api/tasks - Task CRUD operations
- GET/POST /api/projects - Project management
- GET/POST /api/settings - Application settings
- POST /api/sync - Data synchronization
- POST /api/excel/analyze - File import analysis
- GET/POST /api/drive/files - Google Drive integration

### File Structure
/apps/web/src/
├── app/
│   ├── api/ - Backend API routes
│   ├── dashboard/ - Main application interface
│   ├── file-storage/ - File management interface
│   └── account/ - Authentication pages
├── components/
│   └── dashboard/ - Task management components
└── hooks/ - Custom React hooks

/apps/mobile/src/
├── app/ - Mobile screens
├── components/ - Reusable mobile components
└── utils/ - Mobile utilities

## 🔧 Configuration

### Environment Variables
The application automatically handles most configuration, but you may need:
- Google Drive API credentials (for sync)
- Database connection (auto-configured)
- Email service settings (for notifications)

### Settings Panel
Access via the settings gear icon to configure:
- Default task priorities
- Custom categories
- Team member list
- Notification preferences

## 📱 Mobile App

### Installation
- Built with Expo for easy deployment
- Supports iOS and Android
- Same features as web version

### Key Mobile Features
- Touch-optimized interface
- Swipe gestures for task actions
- Offline capability
- Push notifications (ready to enable)

## 🔐 Security & Privacy

### Authentication (Available)
- Email/password registration
- Google OAuth integration
- Secure session management
- Password reset functionality

### Data Protection
- User-specific data isolation
- Secure API endpoints
- Encrypted data transmission
- GDPR-compliant data handling

## 🚀 Deployment

### Web Application
- Built with Next.js for optimal performance
- Ready for Vercel, Netlify, or any hosting platform
- Automatic HTTPS and CDN optimization

### Mobile Application  
- Expo-managed workflow
- Easy App Store/Play Store deployment
- Over-the-air updates capability

## 💡 Tips & Best Practices

### Workflow Optimization
1. **Start with Projects**: Create projects first, then add tasks
2. **Use Categories**: Organize tasks by type (Work, Personal, Urgent)
3. **Set Realistic Due Dates**: Don't overwhelm yourself
4. **Regular Reviews**: Check your dashboard daily
5. **Prioritize Wisely**: Not everything can be high priority

### Team Collaboration
1. **Consistent Naming**: Use clear, descriptive task titles
2. **Regular Updates**: Update task status as work progresses
3. **Communication**: Use task descriptions for detailed notes
4. **Delegation**: Assign tasks to appropriate team members

### Data Management
1. **Regular Backups**: Export your data periodically
2. **Google Drive Sync**: Enable for automatic backups
3. **Clean Up**: Archive completed projects regularly
4. **Import Structure**: Use consistent formats when importing files

## 🆘 Troubleshooting

### Common Issues

#### Google Drive Sync Not Working
- Check internet connection
- Re-authorize Google Drive access
- Verify file permissions

#### Tasks Not Saving
- Check browser storage limits
- Try refreshing the page
- Switch to Google Drive sync

#### Mobile App Issues
- Update Expo Go app
- Check device compatibility
- Restart the app

#### File Import Problems
- Ensure file has proper headers
- Check file format (Excel/CSV/JSON only)
- Verify file isn't corrupted

### Support
- Check browser console (F12) for error details
- Use the "Skip Setup" option if file import fails
- Try different browsers if issues persist

## 📈 Future Enhancements

### Planned Features
- Advanced analytics and reporting
- Team collaboration tools
- Time tracking integration
- Calendar synchronization
- Email notifications
- API integrations
- Custom workflows

### Customization Options
- Themes and dark mode
- Custom fields
- Workflow automation
- Advanced filtering
- Bulk operations
- Template system

## 📞 Getting Help

### Quick Actions
1. **Reset Data**: Use "Skip Setup" on homepage
2. **Export Backup**: Visit /file-storage → Export
3. **Fresh Start**: Clear browser data and reload
4. **Mobile Reset**: Clear Expo cache

### Documentation Updates
This documentation reflects the current version of your Task Manager. As new features are added, the documentation will be updated accordingly.

---

**Version**: 1.0  
**Last Updated**: September 26, 2025  
**Platform**: Web + Mobile (React/React Native)  
**Database**: PostgreSQL  
**Status**: Production Ready ✅

Your Task Manager is fully functional and ready to help you stay organized and productive!