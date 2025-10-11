const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  let error = { 
    message: 'Internal server error',
    statusCode: 500 
  };

  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  } else if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  } else if (err.statusCode) {
    error = { message: err.message, statusCode: err.statusCode };
  }

  res.status(error.statusCode).json({
    error: error.message
  });
};

module.exports = errorHandler;