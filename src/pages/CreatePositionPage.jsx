import React from 'react';
import { useNavigate } from 'react-router-dom';
import PositionForm from '../components/PositionForm';

const CreatePositionPage = ({ account, chainId, contracts, isDeployed, onContractsDeployed }) => {
  const navigate = useNavigate();

  const handlePositionCreated = () => {
    navigate('/dashboard');
  };

  return (
    <PositionForm
      account={account}
      chainId={chainId}
      contracts={contracts}
      isDeployed={isDeployed}
      onContractsDeployed={onContractsDeployed}
      onPositionCreated={handlePositionCreated}
    />
  );
};

export default CreatePositionPage;
