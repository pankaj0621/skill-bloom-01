import Navbar from "./Navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Add top padding to account for fixed navbar */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-6xl pb-24 md:pb-6 pt-16 md:pt-20">
        {children}
      </main>
    </div>
  );
};

export default Layout;
