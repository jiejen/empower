import React from 'react';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemName = '',
  confirmText = 'Delete',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}>
          {title}
        </h3>
        
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}>
          {message}
        </p>

        {itemName && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            }}>
              {itemName}
            </p>
          </div>
        )}

        <p style={{
          margin: '0 0 24px 0',
          fontSize: '13px',
          color: '#ef4444',
          fontWeight: '500',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}>
          You can recover this from the deleted section for 30 days.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ef4444';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const UndoNotification = ({ isVisible, onUndo, countdown, itemName, itemType }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '20px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      minWidth: '350px',
      maxWidth: '500px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
          }}>
            {itemType} deleted
          </p>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#d1d5db',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
          }}>
            "{itemName}" moved to trash
          </p>
        </div>
        
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: countdown <= 2 ? '#fbbf24' : '#10b981',
          marginLeft: '16px',
          minWidth: '40px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}>
          {countdown}
        </div>
      </div>

      <button
        onClick={onUndo}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#4d8be9',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#73a4ec';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#4d8be9';
        }}
      >
        Undo Delete
      </button>
    </div>
  );
};

export { ConfirmationDialog, UndoNotification };
