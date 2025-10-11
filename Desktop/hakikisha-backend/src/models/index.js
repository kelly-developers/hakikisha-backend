// Central export file for all models
const User = require('./User');
const Claim = require('./Claim');
const Verdict = require('./Verdict');
const AIVerdict = require('./AIVerdict');
const FactChecker = require('./FactChecker');
const Blog = require('./Blog');
const Notification = require('./Notification');
const Analytics = require('./Analytics');
const AdminActivity = require('./AdminActivity');
const FactCheckerActivity = require('./FactCheckerActivity');
const TrendingTopic = require('./TrendingTopic');
const SearchLog = require('./SearchLog');
const UserSession = require('./UserSession');
const RegistrationRequest = require('./RegistrationRequest'); // Add this line

module.exports = {
  User,
  Claim,
  Verdict,
  AIVerdict,
  FactChecker,
  Blog,
  Notification,
  Analytics,
  AdminActivity,
  FactCheckerActivity,
  TrendingTopic,
  SearchLog,
  UserSession,
  RegistrationRequest // Add this line
};