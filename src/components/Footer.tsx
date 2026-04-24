export default function Footer() {
  return (
    <footer className="bg-darker py-12 border-t border-primary/20 text-center">
      <div className="container mx-auto px-6">
        <img src="/logo3.png" alt="Lodhi Bhawan" className="h-20 md:h-24 mx-auto mb-6 object-contain" />
        <div className="flex justify-center gap-6 mb-8">
          <a href="https://instagram.com/Lodhibhawan.india" target="_blank" rel="noopener noreferrer" className="text-secondary/60 hover:text-primary transition-colors">@Lodhibhawan.india</a>
        </div>
        <p className="text-secondary/40 text-sm font-light">
          &copy; {new Date().getFullYear()} Lodhi Bhawan. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
