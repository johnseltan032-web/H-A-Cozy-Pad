import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UnitListing() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/host/listing/UnitSelection', { replace: true });
  }, [navigate]);

  return null;
}