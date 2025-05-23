import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FilterIcon, Grid, List, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { getCategoryIcon } from '@/utils/categoryIcons';
import CategoryCard from '@/components/CategoryCard';
import CategoryBadge from '@/components/CategoryBadge';
import { FilterPanel } from '@/components/ui/filter-panel';

// Tipos das categorias
interface Category {
  id: number;
  descricao: string;
  usuario_id: number;
  created_at: string;
}

// Schema de validação do formulário
const categoryFormSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const Categories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Inicializar formulário
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      descricao: '',
    },
  });

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  // Buscar categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Obter ID numérico do usuário
        const numericUserId = await getUserNumericId();
        
        if (!numericUserId) {
          console.error('Não foi possível encontrar o ID numérico do usuário');
          return;
        }

        // Buscar categorias
        const { data, error } = await supabase
          .from('categoria_trasacoes')
          .select('*')
          .eq('usuario_id', numericUserId)
          .order('descricao', { ascending: true });
          
        if (error) throw error;
        
        if (data) {
          setCategories(data);
          setFilteredCategories(data);
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as categorias.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    if (user) {
      fetchCategories();
    }
  }, [user, toast, refreshing]);

  // Filtrar categorias quando o termo de busca muda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const normalizedSearchTerm = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const filtered = categories.filter((category) =>
      category.descricao
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(normalizedSearchTerm)
    );

    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  // Lidar com envio do formulário
  const onSubmit = async (data: CategoryFormValues) => {
    try {
      // Obter ID numérico do usuário
      const numericUserId = await getUserNumericId();
      
      if (!numericUserId) {
        throw new Error('Usuário não encontrado');
      }

      if (editingCategory) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('categoria_trasacoes')
          .update({
            descricao: data.descricao,
            usuario_id: numericUserId,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "Categoria atualizada",
          description: "A categoria foi atualizada com sucesso.",
        });
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from('categoria_trasacoes')
          .insert({
            descricao: data.descricao,
            usuario_id: numericUserId,
          });

        if (error) throw error;

        toast({
          title: "Categoria criada",
          description: "Nova categoria criada com sucesso.",
        });
      }

      // Limpar e fechar
      form.reset();
      setDialogOpen(false);
      setEditingCategory(null);
      setRefreshing(true);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a categoria.",
      });
    }
  };

  // Excluir categoria
  const deleteCategory = async (id: number) => {
    try {
      setDeletingId(id);
      
      // Verificar se existem transações vinculadas a esta categoria
      const { data: transactions, error: checkError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('categoria_id', id)
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (transactions && transactions.length > 0) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: "Esta categoria possui transações vinculadas e não pode ser excluída.",
        });
        return;
      }
      
      // Excluir categoria
      const { error } = await supabase
        .from('categoria_trasacoes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
      
      setRefreshing(true);
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir a categoria.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Editar categoria
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.setValue('descricao', category.descricao);
    setDialogOpen(true);
  };

  // Atualizar lista
  const handleRefresh = () => {
    setRefreshing(true);
  };

  // Abrir formulário para nova categoria
  const handleAddNew = () => {
    setEditingCategory(null);
    form.reset();
    setDialogOpen(true);
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilteredCategories(categories);
    setIsFilterOpen(false);
  };

  // Aplicar filtros
  const handleApplyFilters = (filters: any) => {
    // Implemente a lógica de filtro mais avançada conforme necessário
    setIsFilterOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading || refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </div>

        {/* Painel de filtros */}
        {isFilterOpen && (
          <FilterPanel
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          >
            <FilterPanel.Field label="Buscar por nome">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da categoria..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1.5 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FilterPanel.Field>
          </FilterPanel>
        )}

        {/* Barra de pesquisa e controles de visualização */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              className="pl-8 pr-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1.5 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-md flex">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suas Categorias</CardTitle>
            <CardDescription>
              Gerencie as categorias para organizar suas transações financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCategories.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      id={category.id}
                      name={category.descricao}
                      onEdit={(id, name) => handleEditCategory({ id, descricao: name, usuario_id: 0, created_at: '' })}
                      onDelete={deleteCategory}
                      isDeleting={deletingId === category.id}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="border rounded-md hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.map((category) => (
                          <TableRow key={`${category.id}-row`}>
                            <TableCell>
                              <div className="flex items-center">
                                <CategoryBadge 
                                  name={category.descricao} 
                                  size="md" 
                                  className="mr-2"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Pencil className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => deleteCategory(category.id)}
                                  disabled={deletingId === category.id}
                                >
                                  {deletingId === category.id ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {filteredCategories.map((category) => (
                      <CategoryCard
                        key={`${category.id}-card`}
                        id={category.id}
                        name={category.descricao}
                        onEdit={(id, name) => handleEditCategory({ id, descricao: name, usuario_id: 0, created_at: '' })}
                        onDelete={deleteCategory}
                        isDeleting={deletingId === category.id}
                        className="p-3 border rounded-lg"
                      />
                    ))}
                  </div>
                </>
              )
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {searchTerm ? (
                  <>
                    <p>Nenhuma categoria encontrada para "{searchTerm}".</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar busca
                    </Button>
                  </>
                ) : (
                  <>
                    <p>Você ainda não possui categorias.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={handleAddNew}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar categoria
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para adicionar/editar categoria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Atualize os detalhes da categoria selecionada" 
                : "Preencha os dados para criar uma nova categoria"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input 
                          placeholder="Ex: Alimentação, Transporte, Lazer..." 
                          {...field} 
                        />
                        
                        {/* Previsualização do ícone */}
                        {field.value && (
                          <div className="flex items-center space-x-3 mt-2">
                            <div className="text-sm text-muted-foreground">Pré-visualização:</div>
                            {(() => {
                              const { icon: Icon, color, bgColor } = getCategoryIcon(field.value);
                              return (
                                <div 
                                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full"
                                  style={{ 
                                    backgroundColor: bgColor,
                                    color: color,
                                    borderColor: color,
                                    borderWidth: '1px'
                                  }}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{field.value}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    setDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategory ? "Atualizar" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Categories; 