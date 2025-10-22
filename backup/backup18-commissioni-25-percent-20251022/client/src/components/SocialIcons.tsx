import { useState, useEffect } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';

interface SocialData {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export default function SocialIcons() {
  const [socialData, setSocialData] = useState<SocialData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSocialData = async () => {
      try {
        const response = await apiRequest("GET", "/api/contact-info");
        const data = await response.json();
        setSocialData(data);
      } catch (error) {
        console.error("Errore caricamento dati social:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSocialData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center space-x-2 py-4">
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
      </div>
    );
  }

  const socialLinks = [
    {
      icon: Facebook,
      url: socialData.facebook || "https://facebook.com",
      label: "Facebook",
      color: "hover:text-blue-600"
    },
    {
      icon: Instagram,
      url: socialData.instagram || "https://instagram.com",
      label: "Instagram",
      color: "hover:text-pink-600"
    },
    {
      icon: Twitter,
      url: socialData.twitter || "https://twitter.com",
      label: "Twitter",
      color: "hover:text-blue-500"
    },
    {
      icon: Youtube,
      url: socialData.youtube || "https://youtube.com",
      label: "YouTube",
      color: "hover:text-red-600"
    },
    {
      icon: Linkedin,
      url: socialData.linkedin || "https://linkedin.com",
      label: "LinkedIn",
      color: "hover:text-blue-700"
    },
    {
      icon: Mail,
      url: `mailto:${socialData.email || 'info@studiomedico.it'}`,
      label: "Email",
      color: "hover:text-green-600"
    },
    {
      icon: Phone,
      url: `tel:${socialData.phone || '+390000000000'}`,
      label: "Telefono",
      color: "hover:text-purple-600"
    },
    {
      icon: Globe,
      url: socialData.website || "https://studiomedico.it",
      label: "Sito Web",
      color: "hover:text-indigo-600"
    }
  ];

  return (
    <div className="flex justify-center py-6">
      <TooltipProvider>
        <div className="flex space-x-3">
          {socialLinks.map((social, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-10 h-10 rounded-full transition-colors ${social.color} hover:bg-muted`}
                  onClick={() => window.open(social.url, '_blank')}
                >
                  <social.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{social.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}