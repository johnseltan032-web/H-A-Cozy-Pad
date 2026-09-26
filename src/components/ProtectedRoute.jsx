import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ user, isLoading, allowedRoles }) {
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Redirect unauthenticated users to home or login modal
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Redirect unauthorized roles (e.g., customer attempting to view host dashboard)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}