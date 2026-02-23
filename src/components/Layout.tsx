import Navbar from "./Navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-6xl pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
