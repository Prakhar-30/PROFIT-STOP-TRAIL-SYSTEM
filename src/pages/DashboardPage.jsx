import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

const DashboardPage = ({ account, contracts }) => {
  const navigate = useNavigate();

  const handleAddPosition = () => {
    navigate('/create');
  };

  return (
    <Dashboard
      account={account}
      contracts={contracts}
      onAddPosition={handleAddPosition}
    />
  );
};

export default DashboardPage;
