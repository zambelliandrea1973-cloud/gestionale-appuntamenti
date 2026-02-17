import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-4 text-center text-sm text-gray-500 border-t">
      <div className="container mx-auto">
        © {new Date().getFullYear()} Zambelli Andrea - Tutti i diritti riservati
      </div>
    </footer>
  );
};

export default Footer;